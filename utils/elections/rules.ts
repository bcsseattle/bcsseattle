/**
 * Election rules shared by the website's election page (rows loaded on the
 * server) and the app (rows loaded on the device). Pure and client-safe: no
 * queries here. The vote and nomination handlers check all of this again.
 *
 * Nomination windows and phase words are not here: the website and the app
 * still disagree on those (docs/mobile-app-gaps.md W15), so each keeps its own.
 */
import type { Tables } from '@/types_db';
import type { ElectionType } from '@/types';
import { ELECTION_TYPE_CONFIGS } from '@/utils/election-types';

type ElectionRow = Tables<'elections'>;

/**
 * Where voting stands. Candidate voting follows candidate_voting_start/end
 * when separate periods are on (null means the type's default, BUG-060) and
 * falls back to the election's dates; initiative voting follows start/end_date.
 * Both windows include their edges, as the vote handlers do.
 */
export function votingWindows(
  e: Pick<
    ElectionRow,
    'type' | 'start_date' | 'end_date' | 'enable_separate_voting_periods' | 'candidate_voting_start' | 'candidate_voting_end'
  >,
  now = Date.now()
) {
  const separate =
    e.enable_separate_voting_periods ?? ELECTION_TYPE_CONFIGS[e.type as ElectionType]?.defaultSeparateVotingPeriods ?? false;
  const candidateWindow = {
    start: (separate && e.candidate_voting_start) || e.start_date,
    end: (separate && e.candidate_voting_end) || e.end_date
  };
  const start = Date.parse(e.start_date);
  const end = Date.parse(e.end_date);
  const candidateVotingOpen = now >= Date.parse(candidateWindow.start) && now <= Date.parse(candidateWindow.end);
  const initiativeVotingOpen = now >= start && now <= end;
  return {
    now,
    separate,
    candidateWindow,
    candidateVotingOpen,
    initiativeVotingOpen,
    votingOpen: candidateVotingOpen || initiativeVotingOpen,
    upcoming: now < start,
    closed: now > end
  };
}

export type VotingWindows = ReturnType<typeof votingWindows>;

/**
 * Candidates are elected unopposed once candidate voting is over, when no
 * position had more than one candidate, unless the election turns that off
 * (show_unopposed_status, else the type's default).
 */
export function electedUnopposed(
  e: Pick<ElectionRow, 'type' | 'show_unopposed_status'>,
  candidates: { position: string }[],
  candidateVotingOpen: boolean
) {
  const show = e.show_unopposed_status ?? ELECTION_TYPE_CONFIGS[e.type as ElectionType]?.defaultShowUnopposedStatus ?? true;
  if (!show || candidates.length === 0 || candidateVotingOpen) return false;
  const counts = new Map<string, number>();
  candidates.forEach((c) => counts.set(c.position, (counts.get(c.position) ?? 0) + 1));
  return Array.from(counts.values()).every((n) => n <= 1);
}

export type Position = { position: string; description: string | null; display_order: number };

// Used when election_positions has no rows for the election's type.
const DEFAULT_POSITIONS: Record<string, [string, string][]> = {
  leadership: [
    ['President', 'Chief executive officer who leads the organization and represents it publicly'],
    ['Vice President', 'Second in command who assists the president and steps in when needed'],
    ['Secretary', 'Records meeting minutes, manages correspondence, and maintains official documents'],
    ['Treasurer', 'Manages organizational finances, budget, and financial reporting']
  ],
  board: [
    ['Chairperson', 'Leads board meetings and oversees board activities'],
    ['Board Member', 'Participates in board decisions and organizational governance']
  ],
  committee: [
    ['Committee Chair', 'Leads committee activities and coordinates with the board'],
    ['Committee Member', 'Participates in committee work and supports committee goals']
  ]
};

/** The positions in ballot order: the type's election_positions, else its defaults, else the candidates' own positions. */
export function positionOrder(
  type: string | null,
  dbPositions: Position[] | null,
  candidates: { position: string }[]
): Position[] {
  if (dbPositions?.length) return dbPositions;
  const defaults = type ? DEFAULT_POSITIONS[type] : undefined;
  if (defaults) return defaults.map(([position, description], i) => ({ position, description, display_order: i + 1 }));
  return Array.from(new Set(candidates.map((c) => c.position))).map((position, i) => ({
    position,
    description: '',
    display_order: i + 1
  }));
}

/** Which parts of the ballot are still open to this member. */
export function ballotOffer({
  windows,
  votedCandidates,
  votedInitiatives,
  electedUnopposed,
  candidateCount,
  initiativeCount
}: {
  windows: Pick<VotingWindows, 'candidateVotingOpen' | 'initiativeVotingOpen'>;
  votedCandidates: boolean;
  votedInitiatives: boolean;
  electedUnopposed: boolean;
  candidateCount: number;
  initiativeCount: number;
}) {
  return {
    offerCandidates: windows.candidateVotingOpen && !votedCandidates && !electedUnopposed && candidateCount > 0,
    offerInitiatives: windows.initiativeVotingOpen && !votedInitiatives && initiativeCount > 0
  };
}

/** The ballot's questions: positions in order with their candidates, then initiatives. */
export function ballotQuestions({
  offerCandidates,
  offerInitiatives,
  positions,
  candidates,
  initiatives
}: {
  offerCandidates: boolean;
  offerInitiatives: boolean;
  positions: Position[];
  candidates: Pick<Tables<'candidates'>, 'id' | 'position' | 'full_name' | 'bio'>[];
  initiatives: Pick<Tables<'initiatives'>, 'id' | 'title' | 'description' | 'additional_info_url'>[];
}) {
  return {
    positions: offerCandidates
      ? positions
          .map((p) => ({
            position: p.position,
            description: p.description,
            candidates: candidates
              .filter((c) => c.position === p.position)
              .map((c) => ({ id: c.id, name: c.full_name, detail: c.bio }))
          }))
          .filter((p) => p.candidates.length > 0)
      : [],
    initiatives: offerInitiatives
      ? initiatives.map((i) => ({ id: i.id, title: i.title, description: i.description, url: i.additional_info_url }))
      : []
  };
}
