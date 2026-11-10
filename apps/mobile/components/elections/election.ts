import type { Tables } from '@/types_db';
import {
  ballotOffer,
  electedUnopposed as unopposed,
  positionOrder,
  votingWindows
} from '@/utils/elections/rules';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';

export type Election = Tables<'elections'>;

/**
 * Where an election stands: the shared voting windows, plus the app's own
 * nomination window and phase words. Nominations are open from start to end
 * inclusive, as the server accepts them (the website differs, W15).
 */
export function electionPhase(e: Election, now = Date.now()) {
  const w = votingWindows(e, now);
  const nominationsOpen =
    !!e.nomination_start &&
    !!e.nomination_end &&
    now >= Date.parse(e.nomination_start) &&
    now <= Date.parse(e.nomination_end);

  // Status in words, never colour alone. Same precedence as the website's detail page.
  const phase = nominationsOpen
    ? { label: 'Nominations open', tone: 'orange' as const }
    : w.votingOpen
      ? { label: 'Voting open', tone: 'green' as const }
      : w.closed
        ? { label: 'Closed', tone: 'neutral' as const }
        : { label: 'Upcoming', tone: 'neutral' as const };

  return { ...w, nominationsOpen, phase };
}

/** A list query's rows, never null; errors thrown as their message. */
export async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  return (await must(query)) ?? [];
}

/**
 * An election's type tags, as on the website's list: Leadership when
 * positions are defined for its type (BUG-059), Initiatives when it has any.
 */
export function typeTags(
  e: Pick<Election, 'id' | 'type'>,
  positions: { election_type: string | null }[],
  initiatives: { election_id: string | null }[]
) {
  return [
    ...(positions.some((p) => p.election_type === e.type) ? ['Leadership'] : []),
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
  const [candidates, initiatives, dbPositions, sessions, confirmations, votes] =
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
          .from('election_positions')
          .select('position, description, display_order')
          .eq('election_type', election.type ?? 'leadership')
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
    myCandidacy: candidates.find((c) => c.user_id === userId) ?? null
  };
}

export type ElectionData = Awaited<ReturnType<typeof loadElection>>;
