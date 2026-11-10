import { isInternalRequest } from '@/utils/internal-api';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { votingWindows } from '@/utils/elections/rules';
import { formatDeadline } from '@/utils/format';
import { sendPush, type PushMessage } from '@/utils/push';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Daily (vercel.json): push reminders to active members for elections whose
 * voting or nominations opened in the last 24 hours, and a last-day reminder
 * to members who haven't voted when voting closes within the next 24 hours.
 * Each moment falls in exactly one daily window, so nothing is sent twice.
 * Draft and cancelled elections never send.
 */
export async function GET(request: Request) {
  if (!isInternalRequest(request)) return new Response('Unauthorized', { status: 401 });

  const now = Date.now();
  const within = (iso: string | null | undefined, from: number, to: number) => {
    const t = iso ? Date.parse(iso) : NaN;
    return t > from && t <= to;
  };

  const [{ data: elections, error }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from('elections')
      .select('id, title, type, status, is_active, start_date, end_date, enable_separate_voting_periods, candidate_voting_start, candidate_voting_end, nomination_start, nomination_end')
      .not('status', 'in', '(draft,cancelled)'),
    supabaseAdmin.from('members').select('user_id').eq('isApproved', true).eq('status', 'active').not('user_id', 'is', null)
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const everyone = (members ?? []).map((m) => m.user_id as string);

  const sent: { election: string; kind: string; members: number }[] = [];
  const send = async (election: string, kind: string, userIds: string[], message: PushMessage) => {
    await sendPush(userIds, message);
    sent.push({ election, kind, members: userIds.length });
  };

  for (const e of elections ?? []) {
    if (e.is_active === false) continue;
    const w = votingWindows(e, now);
    const url = `/elections/view/?id=${e.id}`;
    const closesAt = new Date(Math.max(Date.parse(w.candidateWindow.end), Date.parse(e.end_date)));

    if (within(w.candidateWindow.start, now - DAY, now) || within(e.start_date, now - DAY, now)) {
      await send(e.id, 'voting-open', everyone, {
        title: `Voting is open: ${e.title}`,
        body: `Cast your ballot by ${formatDeadline(closesAt)}.`,
        url
      });
    }
    if (w.votingOpen && (within(w.candidateWindow.end, now, now + DAY) || within(e.end_date, now, now + DAY))) {
      // ponytail: "voted" means any completed session; a member who cast only one part of a two-part ballot isn't reminded.
      const { data: voted } = await supabaseAdmin
        .from('vote_sessions')
        .select('user_id')
        .eq('election_id', e.id)
        .not('completed_at', 'is', null);
      const done = new Set((voted ?? []).map((v) => v.user_id));
      await send(e.id, 'last-day', everyone.filter((id) => !done.has(id)), {
        title: `Last day to vote: ${e.title}`,
        body: `Voting closes ${formatDeadline(closesAt)}.`,
        url
      });
    }
    if (within(e.nomination_start, now - DAY, now)) {
      await send(e.id, 'nominations-open', everyone, {
        title: `Nominations are open: ${e.title}`,
        body: e.nomination_end ? `Nominate by ${formatDeadline(e.nomination_end)}.` : 'Nominate a candidate in the app.',
        url
      });
    }
  }
  return Response.json({ sent });
}
