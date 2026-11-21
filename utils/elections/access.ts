import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import { currentUserIsActiveMember } from '@/utils/election-config';
import { electionPhase } from '@/utils/elections/rules';

export const PHASE_COLUMNS =
  'status, type, nomination_start, nomination_end, start_date, end_date, enable_separate_voting_periods, candidate_voting_start, candidate_voting_end';

/**
 * Where the signed-in person stands for this election's ballot: on the roll,
 * and eligible as an approved, active member, or as someone who signed in at
 * the event while event voting is open (at_event). Mirrors
 * election_voter_eligible, which the vote_sessions insert policy checks.
 */
export async function rollStanding(supabase: SupabaseClient<Database>, electionId: string, userId: string, eventVoting: boolean) {
  const [{ data: row }, active] = await Promise.all([
    supabase.from('election_voters').select('at_event').eq('election_id', electionId).eq('user_id', userId).maybeSingle(),
    currentUserIsActiveMember()
  ]);
  return { active, onRoll: !!row, eligible: !!row && (active || (row.at_event && eventVoting)) };
}

/**
 * Whether the signed-in member may cast this part of the ballot now. The
 * ballot must be locked and its window open (electionPhase). The member must
 * be approved and active (BUG-007) and on the voter roll taken at lock (B11).
 * Returns the reason when they can't, else null. The vote_sessions insert
 * policy checks the same in the database (user_can_vote_in_session).
 */
export async function ballotRefusal(
  supabase: SupabaseClient<Database>,
  electionId: string,
  userId: string,
  kind: 'candidates' | 'initiatives' | 'any'
): Promise<string | null> {
  const { data: election } = await supabase.from('elections').select(`${PHASE_COLUMNS}, event_voting`).eq('id', electionId).maybeSingle();
  if (!election) return 'Election not found';

  const p = electionPhase(election);
  const open = kind === 'candidates' ? p.candidateVotingOpen : kind === 'initiatives' ? p.initiativeVotingOpen : p.votingOpen;
  if (!open) {
    return kind === 'candidates'
      ? 'Candidate voting is not currently open for this election'
      : 'Voting is not currently open for this election';
  }

  const standing = await rollStanding(supabase, electionId, userId, election.event_voting);
  if (standing.eligible) return null;
  if (!standing.active) return 'Only approved members with active membership can vote';
  return 'You aren’t on the voter roll for this election. The roll was set when the ballot was locked.';
}
