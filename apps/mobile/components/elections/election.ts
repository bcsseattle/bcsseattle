import type { Tables } from '@/types_db';
import type { ElectionType } from '@/types';
import { ELECTION_TYPE_CONFIGS } from '@/utils/election-types';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';

export type Election = Tables<'elections'>;
type Window = { start: string; end: string };

const within = (now: number, { start, end }: Window) =>
  now >= Date.parse(start) && now <= Date.parse(end);

/**
 * Where an election stands, by the same rules as the website: candidate voting
 * follows candidate_voting_start/end when separate periods are on (null means
 * the type's default, BUG-060), initiative voting follows start/end_date.
 * The server checks all of this again when a vote or nomination comes in.
 */
export function electionPhase(e: Election, now = Date.now()) {
  const separate =
    e.enable_separate_voting_periods ??
    ELECTION_TYPE_CONFIGS[e.type as ElectionType]
      ?.defaultSeparateVotingPeriods ??
    false;
  const candidateWindow = {
    start: (separate && e.candidate_voting_start) || e.start_date,
    end: (separate && e.candidate_voting_end) || e.end_date
  };
  const nominationsOpen =
    !!e.nomination_start &&
    !!e.nomination_end &&
    within(now, { start: e.nomination_start, end: e.nomination_end });
  const candidateVotingOpen = within(now, candidateWindow);
  const initiativeVotingOpen = within(now, {
    start: e.start_date,
    end: e.end_date
  });
  const votingOpen = candidateVotingOpen || initiativeVotingOpen;
  const closed = now > Date.parse(e.end_date);

  // Status in words, never colour alone. Same precedence as the website's detail page.
  const phase = nominationsOpen
    ? { label: 'Nominations open', tone: 'orange' as const }
    : votingOpen
      ? { label: 'Voting open', tone: 'green' as const }
      : closed
        ? { label: 'Closed', tone: 'neutral' as const }
        : { label: 'Upcoming', tone: 'neutral' as const };

  return {
    nominationsOpen,
    candidateVotingOpen,
    initiativeVotingOpen,
    votingOpen,
    closed,
    candidateWindow,
    separate,
    phase
  };
}

export type Position = {
  position: string;
  description: string | null;
  display_order: number;
};

// The website's fallbacks (app/(portal)/elections/[id]/page.tsx) when election_positions has no rows for the type.
const DEFAULT_POSITIONS: Record<string, [string, string][]> = {
  leadership: [
    [
      'President',
      'Chief executive officer who leads the organization and represents it publicly'
    ],
    [
      'Vice President',
      'Second in command who assists the president and steps in when needed'
    ],
    [
      'Secretary',
      'Records meeting minutes, manages correspondence, and maintains official documents'
    ],
    [
      'Treasurer',
      'Manages organizational finances, budget, and financial reporting'
    ]
  ],
  board: [
    ['Chairperson', 'Leads board meetings and oversees board activities'],
    [
      'Board Member',
      'Participates in board decisions and organizational governance'
    ]
  ],
  committee: [
    [
      'Committee Chair',
      'Leads committee activities and coordinates with the board'
    ],
    [
      'Committee Member',
      'Participates in committee work and supports committee goals'
    ]
  ]
};

export function positionOrder(
  type: string,
  dbPositions: Position[],
  candidates: { position: string }[]
): Position[] {
  if (dbPositions.length) return dbPositions;
  const defaults = DEFAULT_POSITIONS[type];
  if (defaults)
    return defaults.map(([position, description], i) => ({
      position,
      description,
      display_order: i + 1
    }));
  return Array.from(new Set(candidates.map((c) => c.position))).map(
    (position, i) => ({
      position,
      description: null,
      display_order: i + 1
    })
  );
}

/** A list query's rows, never null; errors thrown as their message. */
export async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  return (await must(query)) ?? [];
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

  // shouldShowUnopposedStatus: after candidate voting, when no position was contested.
  const showUnopposed =
    election.show_unopposed_status ??
    ELECTION_TYPE_CONFIGS[election.type as ElectionType]
      ?.defaultShowUnopposedStatus ??
    true;
  const counts = new Map<string, number>();
  candidates.forEach((c) =>
    counts.set(c.position, (counts.get(c.position) ?? 0) + 1)
  );
  const electedUnopposed =
    showUnopposed &&
    candidates.length > 0 &&
    !p.candidateVotingOpen &&
    Array.from(counts.values()).every((n) => n <= 1);

  // What the ballot offers, as on the website's detail page.
  const offerCandidates =
    p.candidateVotingOpen &&
    !votedCandidates &&
    !electedUnopposed &&
    candidates.length > 0;
  const offerInitiatives =
    p.initiativeVotingOpen && !votedInitiatives && initiatives.length > 0;

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

/** The ballot's questions: positions in order with their candidates, then initiatives. */
export function ballotQuestions(d: ElectionData) {
  const positions = d.offerCandidates
    ? d.positions
        .map((p) => ({
          position: p.position,
          description: p.description,
          candidates: d.candidates
            .filter((c) => c.position === p.position)
            .map((c) => ({ id: c.id, name: c.full_name, detail: c.bio }))
        }))
        .filter((p) => p.candidates.length > 0)
    : [];
  const initiatives = d.offerInitiatives
    ? d.initiatives.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        url: i.additional_info_url
      }))
    : [];
  return { positions, initiatives };
}
