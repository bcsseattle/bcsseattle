import type { Tables } from '@/types_db';
import {
  ballotOffer,
  electedUnopposed as unopposed,
  electionPhase as sharedPhase,
  positionOrder
} from '@/utils/elections/rules';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';

export type Election = Tables<'elections'>;

/**
 * Where an election stands, by the shared rule the website and the server
 * use (status plus dates, windows inclusive; voting only once the ballot is
 * locked). `phase` is the member wording and its tone; `stage` the phase itself.
 */
export function electionPhase(e: Election, now = Date.now()) {
  const p = sharedPhase(e, now);
  return { ...p, stage: p.phase, phase: { label: p.label.member, tone: p.label.tone } };
}

/** A list query's rows, never null; errors thrown as their message. */
export async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  return (await must(query)) ?? [];
}

/**
 * An election's type tags, as on the website's list: Leadership when it has
 * positions on its ballot, Initiatives when it has any.
 */
export function typeTags(
  e: Pick<Election, 'id'>,
  positions: { election_id: string }[],
  initiatives: { election_id: string | null }[]
) {
  return [
    ...(positions.some((p) => p.election_id === e.id) ? ['Leadership'] : []),
    ...(initiatives.some((i) => i.election_id === e.id) ? ['Initiatives'] : [])
  ];
}

export const INITIATIVE_WORD = {
  yes: 'Support',
  no: 'Oppose',
  abstain: 'Abstain'
} as const;

/**
 * Everything the detail and ballot screens show, read under the member's own
 * RLS: the election, its candidates, initiatives and positions, and the
 * member's own vote sessions, confirmations, votes and nomination.
 */
export async function loadElection(id: string, userId: string) {
  const election = await must(
    supabase.from('elections').select('*').eq('id', id).maybeSingle()
  );
  if (!election) throw new Error('This election was not found.');
  const [candidates, initiatives, dbPositions, sessions, confirmations, votes, nominations] =
    await Promise.all([
      rows(
        supabase
          .from('candidates')
          .select('*')
          .eq('election_id', id)
          .order('position')
      ),
      rows(
        supabase
          .from('initiatives')
          .select('*')
          .eq('election_id', id)
          .order('ballot_order')
      ),
      rows(
        supabase
          .from('ballot_positions')
          .select('position:title, description, display_order')
          .eq('election_id', id)
          .order('display_order')
      ),
      rows(
        supabase
          .from('vote_sessions')
          .select('session_type, confirmation_code, votes_cast, completed_at')
          .eq('user_id', userId)
          .eq('election_id', id)
      ),
      rows(
        supabase
          .from('vote_confirmations')
          .select('session_type, confirmation_code, votes_cast, confirmed_at')
          .eq('user_id', userId)
          .eq('election_id', id)
      ),
      rows(
        supabase
          .from('votes')
          .select(
            'candidate_id, initiative_id, vote_value, candidates(full_name, position), initiatives(title)'
          )
          .eq('user_id', userId)
          .eq('election_id', id)
      ),
      // The member's own nominations (RLS shows them to the nominee).
      rows(
        supabase
          .from('nominations')
          .select('id, position, status, rejection_reason')
          .eq('election_id', id)
          .eq('nominee_user_id', userId)
      )
    ]);
  const positions = positionOrder(
    election.type ?? 'leadership',
    dbPositions,
    candidates
  );
  const p = electionPhase(election);

  const session = (type: 'candidates' | 'initiatives') =>
    sessions.find((s) => s.session_type === type && s.completed_at);
  // Votes from any ballot count, as the vote handlers check them (BUG-016).
  const votedCandidates =
    !!session('candidates') || votes.some((v) => v.candidate_id);
  const votedInitiatives =
    !!session('initiatives') || votes.some((v) => v.initiative_id);

  // Elected only once candidate voting has closed. The website's rule also
  // says so before voting opens (during nominations); the app doesn't.
  const electedUnopposed =
    unopposed(election, candidates, p.candidateVotingOpen) &&
    p.now > Date.parse(p.candidateWindow.end);
  const { offerCandidates, offerInitiatives } = ballotOffer({
    windows: p,
    votedCandidates,
    votedInitiatives,
    electedUnopposed,
    candidateCount: candidates.length,
    initiativeCount: initiatives.length
  });

  return {
    election,
    candidates,
    initiatives,
    positions,
    phase: p,
    electedUnopposed,
    sessions: {
      candidates: session('candidates'),
      initiatives: session('initiatives')
    },
    confirmations,
    votes,
    votedCandidates,
    votedInitiatives,
    offerCandidates,
    offerInitiatives,
    myCandidacy: candidates.find((c) => c.user_id === userId) ?? null,
    myNominations: nominations,
    /** A nomination the member has accepted (waiting for review, or approved). */
    myAcceptedNomination:
      nominations.find((n) => n.status === 'submitted' || n.status === 'approved') ?? null
  };
}

export type ElectionData = Awaited<ReturnType<typeof loadElection>>;
