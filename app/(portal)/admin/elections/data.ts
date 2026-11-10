import 'server-only';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { adminActions, electionPhase, nextAction, type AdminContext } from '@/utils/elections/rules';

/** The new Admin › Elections flow is behind enableElectionManagement until it's turned on. */
export async function electionManagementEnabled() {
  return checkFeatureFlag('enableElectionManagement');
}

export async function requireElectionManagement() {
  if (!(await electionManagementEnabled())) notFound();
}

const STANDING = ['awaiting_acceptance', 'submitted', 'approved'];
const UNDECIDED = ['awaiting_acceptance', 'submitted'];

/**
 * One election with everything the admin screens show, read with the admin's
 * own session (RLS lets admins read drafts and every nomination). The admin
 * layout has already turned away anyone who isn't an admin.
 */
export async function loadAdminElection(id: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: election } = await supabase.from('elections').select('*').eq('id', id).maybeSingle();
  if (!election || !user) notFound();

  const [{ data: positions }, { data: initiatives }, { data: candidates }, { data: nominations }] = await Promise.all([
    supabase.from('ballot_positions').select('*').eq('election_id', id).order('display_order'),
    supabase.from('initiatives').select('*').eq('election_id', id).order('ballot_order'),
    supabase.from('candidates').select('id, user_id, full_name, ballot_position_id, withdrawn_at').eq('election_id', id),
    supabase.from('nominations').select('id, nominee_user_id, status').eq('election_id', id)
  ]);

  const ctx: AdminContext = {
    adminIsStanding:
      (candidates ?? []).some((c) => c.user_id === user.id) ||
      (nominations ?? []).some((n) => n.nominee_user_id === user.id && STANDING.includes(n.status)),
    undecidedNominations: (nominations ?? []).filter((n) => UNDECIDED.includes(n.status)).length,
    emptyPositions: (positions ?? [])
      .filter((p) => !p.vacant && !(candidates ?? []).some((c) => c.ballot_position_id === p.id))
      .map((p) => p.title),
    candidateCount: candidates?.length ?? 0,
    initiativeCount: initiatives?.length ?? 0,
    positionCount: positions?.length ?? 0,
    isRunoff: !!election.runoff_of
  };
  const phase = electionPhase(election);
  // The count is open to admins once voting has closed; ties block certification.
  const outcomes =
    election.status === 'ballot_locked' && phase.votingOver
      ? ((await supabase.rpc('election_outcomes', { p_election: id })).data ?? [])
      : [];
  ctx.unresolvedTies = new Set(outcomes.filter((o) => o.outcome === 'runoff').map((o) => o.ballot_position_id)).size;
  const actions = adminActions(election, ctx);
  const next = nextAction(phase.phase, {
    canPublish: actions.publish === true,
    nominationsToReview: (nominations ?? []).filter((n) => n.status === 'submitted').length,
    ties: ctx.unresolvedTies
  });

  return {
    election,
    positions: positions ?? [],
    initiatives: initiatives ?? [],
    candidates: candidates ?? [],
    nominations: nominations ?? [],
    ctx,
    outcomes,
    phase,
    actions,
    next
  };
}

export type AdminElection = Awaited<ReturnType<typeof loadAdminElection>>;
