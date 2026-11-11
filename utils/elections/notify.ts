import 'server-only';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { sendPush, type PushMessage } from '@/utils/push';
import { formatDeadline } from '@/utils/format';
import { createHash } from 'node:crypto';
import type { dateChanges } from '@/utils/elections/rules';

/**
 * Election notifications (docs/election-management-plan.md D6): email for
 * announcements and personal news, push for reminders and the main
 * announcements.
 *
 * Nothing is sent unless ELECTION_NOTIFICATIONS=send. Until then each call
 * only logs what it would send, so turning it on later loses nothing. Each
 * send is claimed in election_notifications first (unique per election,
 * kind and person), so a retry or a second cron run never sends twice.
 * Emails go one per person, so nobody sees anyone else's address.
 */

export type NoticeKind =
  | 'published'
  | 'nominations_open'
  | 'nominations_closing'
  | 'nominations_extended'
  | 'nominated'
  | 'nomination_approved'
  | 'nomination_rejected'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'voting_open'
  | 'voting_extended'
  | 'cancelled'
  | 'dates_changed'
  | 'results_published';

/**
 * What a notice is recorded under. A notice that can happen more than once in
 * an election (a second extension, another date change) carries what changed
 * after a colon, so each change is told once and a repeat isn't.
 */
type NoticeKey = NoticeKind | `${NoticeKind}:${string}`;

type Notice = {
  electionId: string;
  kind: NoticeKey;
  /** Who gets it; omit for every approved, active member. */
  to?: string[];
  email?: { subject: string; text: string };
  push?: PushMessage;
};

export const sending = () => process.env.ELECTION_NOTIFICATIONS === 'send';

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bcsseattle.org';

async function activeMembers() {
  const { data } = await supabaseAdmin
    .from('members')
    .select('user_id')
    .eq('isApproved', true)
    .eq('status', 'active')
    .not('user_id', 'is', null);
  return (data ?? []).map((m) => m.user_id as string);
}

/** Claims the send: true the first time for this election, kind and person (null: a broadcast). */
async function claim(electionId: string, kind: NoticeKey, userId: string | null) {
  const { error } = await supabaseAdmin.from('election_notifications').insert({ election_id: electionId, kind, user_id: userId });
  if (error && error.code !== '23505') console.error('election notification log:', error);
  return !error;
}

function transport() {
  // SMTP_URL points at another server (Mailpit in development and e2e); otherwise the site's Gmail account.
  return process.env.SMTP_URL
    ? nodemailer.createTransport(process.env.SMTP_URL)
    : nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.MY_EMAIL, pass: process.env.MY_PASSWORD } });
}

async function emails(userIds: string[]) {
  // ponytail: first 1000 accounts, as Admin › Members; page through listUsers if the site outgrows that.
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const byId = new Map((data?.users ?? []).map((u) => [u.id, u.email]));
  return userIds.map((id) => byId.get(id)).filter((e): e is string => !!e);
}

/** Sends one notice; returns how many people it went to (0 in dry run or when already sent). */
export async function notify({ electionId, kind, to, email, push }: Notice): Promise<number> {
  const people = to ?? (await activeMembers());
  if (!sending()) {
    console.info(`[election notifications] would send ${kind} for ${electionId} to ${people.length} people (ELECTION_NOTIFICATIONS is off)`);
    return 0;
  }
  // A broadcast is claimed once; personal notices once per person.
  const recipients = to
    ? (await Promise.all(people.map(async (id) => ((await claim(electionId, kind, id)) ? id : null)))).filter((id): id is string => !!id)
    : (await claim(electionId, kind, null))
      ? people
      : [];
  if (!recipients.length) return 0;

  if (email) {
    const mail = transport();
    const from = process.env.MY_EMAIL || 'BCS Seattle <no-reply@bcsseattle.org>';
    for (const address of await emails(recipients)) {
      await mail.sendMail({ from, to: address, subject: email.subject, text: email.text }).catch((e) => console.error('election email:', e));
    }
  }
  if (push) await sendPush(recipients, push);
  return recipients.length;
}

// ---------------------------------------------------------------- the notices

async function election(id: string) {
  const { data } = await supabaseAdmin.from('elections').select('*').eq('id', id).single();
  return data!;
}

const link = (id: string) => `${site()}/elections/${id}`;
const appUrl = (id: string) => `/elections/view/?id=${id}`;

export async function notifyPublished(id: string) {
  const e = await election(id);
  const when = e.nomination_start ? `Nominations open ${formatDeadline(e.nomination_start)}.` : `Voting opens ${formatDeadline(e.start_date)}.`;
  return notify({
    electionId: id,
    kind: 'published',
    email: { subject: `New election: ${e.title}`, text: `${e.title} has been announced. ${when}\n\n${link(id)}` }
  });
}

export async function notifyCancelled(id: string) {
  const e = await election(id);
  return notify({
    electionId: id,
    kind: 'cancelled',
    email: { subject: `Cancelled: ${e.title}`, text: `${e.title} has been cancelled.\n\nReason: ${e.cancel_reason ?? ''}\n\n${link(id)}` },
    push: { title: `Cancelled: ${e.title}`, body: e.cancel_reason ?? 'This election has been cancelled.', url: appUrl(id) }
  });
}

export async function notifyExtended(id: string, field: 'nomination_end' | 'end_date' | 'candidate_voting_end') {
  const e = await election(id);
  const nominations = field === 'nomination_end';
  const until = e[field] as string;
  return notify({
    electionId: id,
    // Keyed by the new deadline: a second extension is told too.
    kind: `${nominations ? 'nominations_extended' : 'voting_extended'}:${until}`,
    email: {
      subject: `${nominations ? 'Nominations' : 'Voting'} extended: ${e.title}`,
      text: `${nominations ? 'Nominations' : 'Voting'} for ${e.title} now ${nominations ? 'close' : 'closes'} ${formatDeadline(until)}.\n\n${link(id)}`
    }
  });
}

export async function notifyResultsPublished(id: string) {
  const e = await election(id);
  return notify({
    electionId: id,
    kind: 'results_published',
    email: { subject: `Results: ${e.title}`, text: `The results of ${e.title} are published.\n\n${link(id)}/results` },
    push: { title: `Results: ${e.title}`, body: 'The results are published.', url: `/elections/results/?id=${id}` }
  });
}

/** To the nominee of someone else's nomination: accept or decline. */
export async function notifyNominated(nominationId: string) {
  const { data: n } = await supabaseAdmin.from('nominations').select('*').eq('id', nominationId).single();
  if (!n || n.nominated_by === n.nominee_user_id) return 0;
  const e = await election(n.election_id);
  return notify({
    electionId: n.election_id,
    kind: 'nominated',
    to: [n.nominee_user_id],
    email: {
      subject: `You've been nominated for ${n.position}`,
      text: `You've been nominated for ${n.position} in ${e.title}.${n.message ? `\n\n"${n.message}"` : ''}\n\nAccept or decline by ${formatDeadline(e.nomination_end!)}:\n${site()}/elections/${e.id}/nominations/${n.id}`
    },
    push: { title: `You've been nominated for ${n.position}`, body: 'Accept or decline in the app or on the website.', url: appUrl(e.id) }
  });
}

/** To the nominee (and the nominator, if someone else): approved, or not and why. */
export async function notifyDecided(nominationId: string) {
  const { data: n } = await supabaseAdmin.from('nominations').select('*').eq('id', nominationId).single();
  if (!n || !['approved', 'rejected'].includes(n.status)) return 0;
  const e = await election(n.election_id);
  const approved = n.status === 'approved';
  const people = Array.from(new Set([n.nominee_user_id, n.nominated_by].filter(Boolean))) as string[];
  return notify({
    electionId: n.election_id,
    kind: approved ? 'nomination_approved' : 'nomination_rejected',
    to: people,
    email: {
      subject: approved ? `On the ballot: ${n.position}` : `Nomination not approved: ${n.position}`,
      text: approved
        ? `${n.full_name ?? 'The nominee'} is on the ballot for ${n.position} in ${e.title}.\n\n${link(e.id)}`
        : `The nomination for ${n.position} in ${e.title} wasn't approved.\n\nReason: ${n.rejection_reason ?? ''}\n\n${site()}/account/nominations`
    },
    push: approved
      ? { title: `On the ballot: ${n.position}`, body: e.title, url: appUrl(e.id) }
      : { title: `Nomination not approved: ${n.position}`, body: n.rejection_reason ?? e.title, url: appUrl(e.id) }
  });
}

/**
 * An admin changed a published election's dates (editing after publishing):
 * every member is told what moved. Keyed by the new dates, so the same change
 * is told once and a later one is told again.
 */
export async function notifyDatesChanged(id: string, changes: ReturnType<typeof dateChanges>) {
  if (!changes.length) return 0;
  const e = await election(id);
  const when = (iso: string | null) => (iso ? formatDeadline(iso) : 'not set');
  const key = createHash('sha1')
    .update(changes.map((c) => `${c.field}=${c.to}`).join('|'))
    .digest('hex')
    .slice(0, 12);
  return notify({
    electionId: id,
    kind: `dates_changed:${key}`,
    email: {
      subject: `Dates changed: ${e.title}`,
      text: [
        `The dates of ${e.title} have changed:`,
        '',
        ...changes.map((c) => `${c.label}: ${when(c.to)} (was ${when(c.from)})`),
        '',
        link(id)
      ].join('\n')
    }
  });
}

/** To the member who proposed an initiative: on the ballot, or not and why. Keyed by proposal (up to 3 each). */
export async function notifyProposalDecided(proposalId: string) {
  const { data: p } = await supabaseAdmin.from('initiative_proposals').select('*').eq('id', proposalId).single();
  if (!p || !['approved', 'rejected'].includes(p.status)) return 0;
  const e = await election(p.election_id);
  const approved = p.status === 'approved';
  return notify({
    electionId: p.election_id,
    kind: `${approved ? 'proposal_approved' : 'proposal_rejected'}:${p.id}`,
    to: [p.proposed_by],
    email: {
      subject: approved ? `On the ballot: ${p.title}` : `Initiative not approved: ${p.title}`,
      text: approved
        ? `Your initiative "${p.title}" is on the ballot in ${e.title}.\n\n${link(e.id)}`
        : `Your initiative "${p.title}" in ${e.title} wasn't approved.\n\nReason: ${p.rejection_reason ?? ''}\n\n${site()}/elections/${e.id}/proposals/${p.id}`
    },
    push: { title: approved ? 'Your initiative is on the ballot' : 'Initiative not approved', body: p.title, url: appUrl(e.id) }
  });
}
