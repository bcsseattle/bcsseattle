'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { getStatusRedirect } from '@/utils/helpers';
import { dbMessage, photoFrom, uploadCandidatePhoto } from '@/utils/elections/photos';
import { notifyNominated } from '@/utils/elections/notify';

/**
 * Member nomination actions (docs/election-management-plan.md Phase 3). Each
 * calls a nomination_* database function with the member's own session; the
 * functions check the window, eligibility and who may do what, and refuse in
 * plain sentences shown back on the form.
 */

export type NominationState = { error?: string; values?: Record<string, string> };

async function session() {
  if (!(await checkFeatureFlag('enableElectionManagement'))) redirect('/elections');
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return { supabase, userId: user.id };
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '').trim();
const valuesOf = (formData: FormData) =>
  Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => typeof v === 'string')) as Record<string, string>;

/** The nominee's details, with the photo stored first (in their own folder). */
type Details = { p_full_name: string; p_bio?: string; p_manifesto?: string; p_photo_url?: string };

async function details(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData
): Promise<Details | { error: string }> {
  const photo = photoFrom(formData);
  let photoUrl: string | null = null;
  if (photo) {
    const uploaded = await uploadCandidatePhoto(supabase, userId, photo);
    if ('error' in uploaded) return { error: uploaded.error };
    photoUrl = uploaded.url;
  }
  return {
    p_full_name: text(formData, 'full_name'),
    p_bio: text(formData, 'bio') || undefined,
    p_manifesto: text(formData, 'manifesto') || undefined,
    p_photo_url: photoUrl ?? undefined
  };
}

/** Nominate yourself (submitted for review) or another member (who then accepts or declines). */
export async function nominate(electionId: string, _: NominationState, formData: FormData): Promise<NominationState> {
  const { supabase, userId } = await session();
  const values = valuesOf(formData);
  const self = values.who !== 'other';
  const nominee = self ? userId : values.nominee;
  if (!values.position) return { error: 'Choose a position.', values };
  if (!nominee) return { error: 'Choose the member you’re nominating.', values };

  const own = self ? await details(supabase, userId, formData) : null;
  if (own && 'error' in own) return { error: own.error, values };
  const { data: created, error } = await supabase.rpc('nomination_create', {
    p_election: electionId,
    p_position: values.position,
    p_nominee: nominee,
    p_message: self ? undefined : values.message || undefined,
    ...own
  });
  if (error) return { error: dbMessage(error), values };
  if (!self && created) await notifyNominated(created);

  revalidatePath(`/elections/${electionId}`);
  redirect(
    getStatusRedirect(
      '/account/nominations',
      self ? 'Nomination submitted.' : 'Nomination sent.',
      self ? 'An admin reviews it after nominations close.' : 'They’ll see it under My nominations and can accept or decline.'
    )
  );
}

/** The nominee accepts (with their details) or declines; the button pressed decides. */
export async function respondToNomination(nominationId: string, _: NominationState, formData: FormData): Promise<NominationState> {
  const { supabase, userId } = await session();
  const values = valuesOf(formData);
  const accept = values.answer === 'accept';
  const own = accept ? await details(supabase, userId, formData) : null;
  if (own && 'error' in own) return { error: own.error, values };
  const { error } = await supabase.rpc('nomination_respond', { p_nomination: nominationId, p_accept: accept, ...own });
  if (error) return { error: dbMessage(error), values };
  redirect(
    getStatusRedirect(
      '/account/nominations',
      accept ? 'Nomination accepted.' : 'Nomination declined.',
      accept ? 'An admin reviews it after nominations close.' : ''
    )
  );
}

/** The nominee changes their name, statement or photo, until the ballot is locked. */
export async function updateNomination(nominationId: string, _: NominationState, formData: FormData): Promise<NominationState> {
  const { supabase, userId } = await session();
  const values = valuesOf(formData);
  const own = await details(supabase, userId, formData);
  if ('error' in own) return { error: own.error, values };
  const { error } = await supabase.rpc('nomination_update', {
    p_nomination: nominationId,
    p_full_name: own.p_full_name,
    p_bio: own.p_bio,
    p_manifesto: own.p_manifesto,
    p_photo_url: own.p_photo_url
  });
  if (error) return { error: dbMessage(error), values };
  redirect(getStatusRedirect('/account/nominations', 'Nomination updated.', ''));
}

export async function withdrawNomination(nominationId: string): Promise<NominationState> {
  const { supabase } = await session();
  const { error } = await supabase.rpc('nomination_withdraw', { p_nomination: nominationId });
  if (error) return { error: dbMessage(error) };
  redirect(getStatusRedirect('/account/nominations', 'Nomination withdrawn.', ''));
}
