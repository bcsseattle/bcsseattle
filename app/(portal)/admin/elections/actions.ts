'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { getStatusRedirect } from '@/utils/helpers';
import { dateChanges, defaultTimeline, fromLocalInput, validateTimeline } from '@/utils/elections/rules';
import type { ElectionType } from '@/types';
import { dbMessage, photoFrom, uploadCandidatePhoto } from '@/utils/elections/photos';
import {
  notifyCancelled,
  notifyDatesChanged,
  notifyDecided,
  notifyExtended,
  notifyPublished,
  notifyResultsPublished
} from '@/utils/elections/notify';

/**
 * Admin › Elections actions. Each checks the caller on the server, then writes
 * with the admin's own session, so RLS and the database's guards (frozen
 * ballot, timeline order, status changes only through election_* functions)
 * apply as well. Every change is logged by trigger in election_events.
 */

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What was submitted, so the form shows it again after an error. */
  values?: Record<string, string>;
};

async function guard() {
  if (!(await isCurrentUserAdmin()) || !(await checkFeatureFlag('enableElectionManagement'))) redirect('/');
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, userId: user!.id };
}

const valuesOf = (formData: FormData) =>
  Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => typeof v === 'string')) as Record<string, string>;

const fieldErrors = (error: z.ZodError) =>
  Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message]));


const editPath = (id: string, step: string) => `/admin/elections/${id}/edit?step=${step}`;

// ---------------------------------------------------------------- basics

const BasicsSchema = z.object({
  title: z.string().trim().min(1, 'Give the election a title.').max(200, 'Keep the title under 200 characters.'),
  description: z
    .string()
    .trim()
    .max(2000, 'Keep the description under 2,000 characters.')
    .transform((v) => v || null),
  type: z.enum(['leadership', 'board', 'initiative'], { message: 'Choose a type.' })
});

/** Creates a draft with the type's positions (by trigger) and a starting timeline. */
export async function createElection(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await guard();
  const parsed = BasicsSchema.safeParse(valuesOf(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: valuesOf(formData) };

  const { data, error } = await supabase
    .from('elections')
    .insert({ ...parsed.data, created_by: userId, ...defaultTimeline(parsed.data.type as ElectionType) })
    .select('id')
    .single();
  if (error || !data) {
    console.error('createElection:', error);
    return { error: error ? dbMessage(error) : 'The draft wasn’t saved.', values: valuesOf(formData) };
  }
  redirect(editPath(data.id, 'ballot'));
}

export async function saveBasics(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await guard();
  const parsed = BasicsSchema.safeParse(valuesOf(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: valuesOf(formData) };

  const { error } = await supabase.from('elections').update(parsed.data).eq('id', id);
  if (error) return { error: dbMessage(error), values: valuesOf(formData) };
  revalidatePath(`/admin/elections/${id}`);
  redirect(formData.get('then') === 'overview' ? `/admin/elections/${id}` : editPath(id, 'ballot'));
}

// ---------------------------------------------------------------- positions and initiatives

const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

const BallotSchema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1, 'Every position needs a title.').max(120, 'Keep position titles under 120 characters.'),
        description: z
          .string()
          .trim()
          .max(1000, 'Keep position descriptions under 1,000 characters.')
          .transform((v) => v || null),
        seats: z.coerce.number().int().min(1, 'Seats run from 1 to 9.').max(9, 'Seats run from 1 to 9.')
      })
    )
    .refine((ps) => new Set(ps.map((p) => p.title.toLowerCase())).size === ps.length, 'Two positions have the same title.'),
  initiatives: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1, 'Every initiative needs a title.').max(200, 'Keep initiative titles under 200 characters.'),
      description: z
        .string()
        .trim()
        .max(4000, 'Keep initiative descriptions under 4,000 characters.')
        .transform((v) => v || null),
      additional_info_url: z
        .string()
        .trim()
        .transform((v) => v || null)
        .refine((v) => v === null || /^https?:\/\/\S+$/.test(v), 'Links start with https://'),
      pass_threshold: z.enum(['majority', 'two_thirds'])
    })
  )
});

/**
 * Replaces the draft's positions and initiatives with the submitted lists, in
 * their order. Rows that keep their id are updated, so their history stays in
 * one place in the activity log.
 */
export async function saveBallot(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await guard();
  const raw = String(formData.get('ballot') ?? '');
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: 'The ballot couldn’t be read. Reload the page and try again.' };
  }
  const parsed = BallotSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: { ballot: raw } };

  const [{ data: oldPositions }, { data: oldInitiatives }] = await Promise.all([
    supabase.from('ballot_positions').select('id, title').eq('election_id', id),
    supabase.from('initiatives').select('id').eq('election_id', id)
  ]);
  const oldTitle = new Map((oldPositions ?? []).map((p) => [p.id, p.title]));
  const { positions, initiatives } = parsed.data;
  const keptPositions = new Set(positions.map((p) => p.id).filter(isUuid));
  const keptInitiatives = new Set(initiatives.map((i) => i.id).filter(isUuid));

  // A published election may already have candidates or nominations for a
  // position; removing it would delete them with it, so that's refused.
  const removed = (oldPositions ?? []).filter((p) => !keptPositions.has(p.id));
  if (removed.length) {
    const ids = removed.map((p) => p.id);
    const [{ data: c }, { data: n }] = await Promise.all([
      supabase.from('candidates').select('ballot_position_id').in('ballot_position_id', ids),
      supabase.from('nominations').select('ballot_position_id').in('ballot_position_id', ids)
    ]);
    const busy = removed.filter((p) => [...(c ?? []), ...(n ?? [])].some((r) => r.ballot_position_id === p.id));
    if (busy.length) {
      return {
        error: `${busy.map((p) => p.title).join(', ')} already ${busy.length === 1 ? 'has' : 'have'} nominations or candidates, so ${busy.length === 1 ? 'it' : 'they'} can’t be removed. Rename it, or reject or withdraw them first.`,
        values: { ballot: raw }
      };
    }
  }

  const steps = [
    ...(oldPositions ?? []).filter((p) => !keptPositions.has(p.id)).map((p) => () => supabase.from('ballot_positions').delete().eq('id', p.id)),
    ...(oldInitiatives ?? []).filter((i) => !keptInitiatives.has(i.id)).map((i) => () => supabase.from('initiatives').delete().eq('id', i.id)),
    // Titles are unique per election: renamed positions take a placeholder
    // title first, so swapping two names doesn't collide halfway through.
    ...positions
      .filter((p) => isUuid(p.id) && oldTitle.get(p.id!) !== p.title)
      .map((p) => () => supabase.from('ballot_positions').update({ title: `${p.id}` }).eq('id', p.id!)),
    ...positions.map((p, i) => () => {
      const row = { title: p.title, description: p.description, seats: p.seats, display_order: i + 1 };
      return isUuid(p.id)
        ? supabase.from('ballot_positions').update(row).eq('id', p.id!)
        : supabase.from('ballot_positions').insert({ ...row, election_id: id });
    }),
    ...initiatives.map((t, i) => () => {
      const row = {
        title: t.title,
        description: t.description,
        additional_info_url: t.additional_info_url,
        pass_threshold: t.pass_threshold,
        ballot_order: i + 1
      };
      return isUuid(t.id)
        ? supabase.from('initiatives').update(row).eq('id', t.id!)
        : supabase.from('initiatives').insert({ ...row, election_id: id });
    })
  ];
  // ponytail: sequential writes, not one transaction; a failure part-way leaves
  // the draft partly saved (the form shows the error and the saved state on reload).
  for (const step of steps) {
    const { error } = await step();
    if (error) {
      console.error('saveBallot:', error);
      return { error: dbMessage(error), values: { ballot: raw } };
    }
  }
  revalidatePath(`/admin/elections/${id}`);
  redirect(formData.get('then') === 'overview' ? `/admin/elections/${id}` : editPath(id, 'timeline'));
}

// ---------------------------------------------------------------- timeline

const TIMELINE_FIELDS = [
  'nomination_start',
  'nomination_end',
  'start_date',
  'end_date',
  'candidate_voting_start',
  'candidate_voting_end',
  'results_date'
] as const;

export async function saveTimeline(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await guard();
  const values = valuesOf(formData);
  const errors: Record<string, string> = {};
  const parsed: Record<string, string | null> = {};
  for (const field of TIMELINE_FIELDS) {
    const raw = values[field]?.trim();
    if (!raw) {
      parsed[field] = null;
      continue;
    }
    const r = fromLocalInput(raw);
    if ('error' in r) errors[field] = r.error;
    else parsed[field] = r.iso;
  }
  if (!parsed.start_date) errors.start_date ??= 'Set when voting opens.';
  if (!parsed.end_date) errors.end_date ??= 'Set when voting closes.';
  const separate = values.enable_separate_voting_periods === 'on';
  if (Object.keys(errors).length) return { fieldErrors: errors, values };

  const { data: election } = await supabase
    .from('elections')
    .select('type, status, nomination_start, nomination_end, start_date, end_date, candidate_voting_start, candidate_voting_end, results_date')
    .eq('id', id)
    .single();
  // Once the ballot is locked nominations are over: the form doesn't show
  // them, and they keep their values (the database refuses a change).
  const locked = election?.status === 'ballot_locked';
  const row = {
    nomination_start: locked ? election.nomination_start : parsed.nomination_start,
    nomination_end: locked ? election.nomination_end : parsed.nomination_end,
    results_date: parsed.results_date,
    start_date: parsed.start_date!,
    end_date: parsed.end_date!,
    enable_separate_voting_periods: separate,
    candidate_voting_start: separate ? parsed.candidate_voting_start : null,
    candidate_voting_end: separate ? parsed.candidate_voting_end : null
  };
  // Order errors are refused here (and by the database). A missing nominations
  // window or a voting start in the past is kept: a draft can be saved and
  // fixed later, and Publish checks both.
  const check = validateTimeline({ ...row, type: election?.type ?? 'leadership' }, { hasPositions: false, now: 0 });
  if (!check.valid) return { fieldErrors: check.errors as Record<string, string>, values };

  const { error } = await supabase.from('elections').update(row).eq('id', id);
  if (error) return { error: dbMessage(error), values };
  // Members are told when a published election's dates move (drafts are private).
  if (election && (election.status === 'scheduled' || election.status === 'ballot_locked')) {
    await notifyDatesChanged(id, dateChanges(election, row));
  }
  revalidatePath(`/admin/elections/${id}`);
  redirect(formData.get('then') === 'overview' ? `/admin/elections/${id}` : editPath(id, 'settings'));
}

// ---------------------------------------------------------------- eligibility and settings

export async function saveSettings(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await guard();
  const values = valuesOf(formData);
  let cutoff: string | null = null;
  if (values.eligibility_cutoff?.trim()) {
    const r = fromLocalInput(values.eligibility_cutoff.trim());
    if ('error' in r) return { fieldErrors: { eligibility_cutoff: r.error }, values };
    cutoff = r.iso;
  }
  const unopposed = { default: null, show: true, hide: false }[values.show_unopposed_status as 'default' | 'show' | 'hide'];
  if (unopposed === undefined) return { fieldErrors: { show_unopposed_status: 'Choose one.' }, values };

  const { error } = await supabase
    .from('elections')
    .update({ eligibility_cutoff: cutoff, show_unopposed_status: unopposed })
    .eq('id', id);
  if (error) return { error: dbMessage(error), values };
  revalidatePath(`/admin/elections/${id}`);
  redirect(formData.get('then') === 'overview' ? `/admin/elections/${id}` : editPath(id, 'review'));
}

// ---------------------------------------------------------------- transitions

export async function publishElection(id: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_publish', { p_election: id });
  if (error) return { error: dbMessage(error) };
  await notifyPublished(id);
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(`/admin/elections/${id}`, 'Election published.', 'Members can see it now.'));
}

export async function deleteDraft(id: string): Promise<FormState> {
  const { supabase } = await guard();
  // RLS lets admins delete drafts only; a published election is cancelled instead.
  const { data, error } = await supabase.from('elections').delete().eq('id', id).select('id');
  if (error) return { error: dbMessage(error) };
  if (!data?.length) return { error: 'Only a draft can be deleted. Cancel a published election instead.' };
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect('/admin/elections', 'Draft deleted.', ''));
}

export async function cancelElection(id: string, reason: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_cancel', { p_election: id, p_reason: reason });
  if (error) return { error: dbMessage(error) };
  await notifyCancelled(id);
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(`/admin/elections/${id}`, 'Election cancelled.', 'Members see it as cancelled, with your reason.'));
}

// ---------------------------------------------------------------- nominations

const nominationsTab = (id: string) => `/admin/elections/${id}?tab=nominations`;

export async function approveNomination(id: string, nominationId: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('nomination_decide', { p_nomination: nominationId, p_approve: true });
  if (error) return { error: dbMessage(error) };
  await notifyDecided(nominationId);
  revalidatePath(`/admin/elections/${id}`);
  redirect(getStatusRedirect(nominationsTab(id), 'Nomination approved.', 'The candidate is on the ballot.'));
}

export async function rejectNomination(id: string, nominationId: string, reason: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('nomination_decide', { p_nomination: nominationId, p_approve: false, p_reason: reason });
  if (error) return { error: dbMessage(error) };
  await notifyDecided(nominationId);
  revalidatePath(`/admin/elections/${id}`);
  redirect(getStatusRedirect(nominationsTab(id), 'Nomination not approved.', 'The nominee sees your reason.'));
}

/** The candidate's details from a form, with a new photo stored first. */
async function candidateDetails(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, formData: FormData) {
  const photo = photoFrom(formData);
  let photoUrl: string | undefined;
  if (photo) {
    const uploaded = await uploadCandidatePhoto(supabase, userId, photo);
    if ('error' in uploaded) return { error: uploaded.error };
    photoUrl = uploaded.url;
  }
  const text = (name: string) => String(formData.get(name) ?? '').trim();
  return { full_name: text('full_name'), bio: text('bio') || null, manifesto: text('manifesto') || null, photo_url: photoUrl };
}

/** Adds a candidate directly: a member, or a name only (election_add_candidate). */
export async function addCandidate(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await guard();
  const values = valuesOf(formData);
  if (!values.position) return { error: 'Choose a position.', values };
  const d = await candidateDetails(supabase, userId, formData);
  if ('error' in d) return { error: d.error, values };
  const { error } = await supabase.rpc('election_add_candidate', {
    p_election: id,
    p_position: values.position,
    p_user: values.member || null, // null: a name only (the argument has no default)
    p_full_name: d.full_name,
    p_bio: d.bio ?? undefined,
    p_manifesto: d.manifesto ?? undefined,
    p_photo_url: d.photo_url
  } as never);
  if (error) return { error: dbMessage(error), values };
  revalidatePath(`/admin/elections/${id}`);
  redirect(getStatusRedirect(nominationsTab(id), 'Candidate added.', ''));
}

/**
 * Fixes a candidate's name, statement or photo. Before the lock anything
 * goes; after it the database allows exactly these fields (B14). Logged.
 */
export async function editCandidate(id: string, candidateId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await guard();
  const values = valuesOf(formData);
  const d = await candidateDetails(supabase, userId, formData);
  if ('error' in d) return { error: d.error, values };
  if (d.full_name.length < 2) return { error: 'Give the name to show on the ballot.', values };
  if (d.manifesto && (d.manifesto.length < 10 || d.manifesto.length > 1000))
    return { error: 'The platform must be 10 to 1,000 characters, or left empty.', values };
  const { error } = await supabase
    .from('candidates')
    .update({ full_name: d.full_name, bio: d.bio, manifesto: d.manifesto, ...(d.photo_url ? { photo_url: d.photo_url } : {}) })
    .eq('id', candidateId)
    .eq('election_id', id);
  if (error) return { error: dbMessage(error), values };
  revalidatePath(`/admin/elections/${id}`);
  redirect(getStatusRedirect(nominationsTab(id), 'Candidate updated.', ''));
}

// ---------------------------------------------------------------- ballot and voting

const tab = (id: string, name: 'ballot' | 'voting') => `/admin/elections/${id}?tab=${name}`;

/**
 * A position's decision before the lock: vacant (no one stands), or for an
 * uncontested one whether it's elected unopposed or kept on the ballot.
 * The database allows this only while the ballot is open.
 */
export async function decidePosition(
  id: string,
  positionId: string,
  decision: 'vacant' | 'not_vacant' | 'elect' | 'keep_on_ballot'
): Promise<FormState> {
  const { supabase } = await guard();
  const change =
    decision === 'vacant' || decision === 'not_vacant'
      ? { vacant: decision === 'vacant' }
      : { unopposed_decision: decision };
  const { error } = await supabase.from('ballot_positions').update(change).eq('id', positionId).eq('election_id', id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/admin/elections/${id}`);
  redirect(tab(id, 'ballot'));
}

/** Moves a deadline later with a reason (election_extend): nominations, voting, or candidate voting. */
export async function extendDeadline(
  id: string,
  field: 'nomination_end' | 'end_date' | 'candidate_voting_end',
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await guard();
  const values = valuesOf(formData);
  const until = fromLocalInput(values.until ?? '');
  if ('error' in until) return { fieldErrors: { until: until.error }, values };
  const { error } = await supabase.rpc('election_extend', {
    p_election: id,
    p_field: field,
    p_until: until.iso,
    p_reason: values.reason ?? ''
  });
  if (error) return { error: dbMessage(error), values };
  await notifyExtended(id, field);
  revalidatePath(`/admin/elections/${id}`);
  redirect(
    getStatusRedirect(
      tab(id, field === 'nomination_end' ? 'ballot' : 'voting'),
      field === 'nomination_end' ? 'Nominations extended.' : 'Voting extended.',
      'Recorded in the activity log.'
    )
  );
}

export async function lockBallot(id: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_lock_ballot', { p_election: id });
  if (error) return { error: dbMessage(error) };
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(tab(id, 'ballot'), 'Ballot locked.', 'Voting opens at the time set. The voter roll is taken.'));
}

/** After the lock (B13): the candidate stays on the ballot, labelled, and can't be chosen or win. */
export async function withdrawCandidate(id: string, candidateId: string, reason: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_withdraw_candidate', { p_candidate: candidateId, p_reason: reason });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/admin/elections/${id}`);
  redirect(getStatusRedirect(tab(id, 'ballot'), 'Candidate marked withdrawn.', 'Members can’t choose them any more.'));
}

// ---------------------------------------------------------------- results

const resultsTab = (id: string) => `/admin/elections/${id}?tab=results`;

/** Freezes the count (election_certify). Refused while a tie has no certified run-off. */
export async function certifyElection(id: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_certify', { p_election: id });
  if (error) return { error: dbMessage(error) };
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(resultsTab(id), 'Results certified.', 'Members see them once you publish them.'));
}

/** Until results are published (D8), with a reason. */
export async function reopenCertification(id: string, reason: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_reopen_certification', { p_election: id, p_reason: reason });
  if (error) return { error: dbMessage(error) };
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(resultsTab(id), 'Certification reopened.', ''));
}

export async function publishResults(id: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_publish_results', { p_election: id });
  if (error) return { error: dbMessage(error) };
  await notifyResultsPublished(id);
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(resultsTab(id), 'Results published.', 'Members can see them now.'));
}

export async function archiveElection(id: string): Promise<FormState> {
  const { supabase } = await guard();
  const { error } = await supabase.rpc('election_archive', { p_election: id });
  if (error) return { error: dbMessage(error) };
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(`/admin/elections/${id}`, 'Election archived.', ''));
}

/** A run-off for a tied position: a linked draft to set dates for and publish. */
export async function startRunoff(id: string, positionId: string): Promise<FormState> {
  const { supabase } = await guard();
  const { data: runoff, error } = await supabase.rpc('election_start_runoff', { p_election: id, p_position: positionId });
  if (error || !runoff) return { error: error ? dbMessage(error) : 'The run-off wasn’t created.' };
  revalidatePath('/admin/elections');
  redirect(getStatusRedirect(editPath(runoff, 'timeline'), 'Run-off created.', 'Set its voting dates, then publish it.'));
}
