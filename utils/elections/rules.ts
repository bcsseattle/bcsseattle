/**
 * Election rules shared by the website (rows loaded on the server), the app
 * (rows loaded on the device) and the admin screens. Pure and client-safe: no
 * queries here. The handlers and the database (supabase/migrations/
 * 20261110120100_election_lifecycle.sql) check all of this again.
 *
 * Where an election stands comes from two things (docs/election-management-plan.md
 * D2): elections.status, which holds only what an admin decided, and the dates,
 * which decide when nominations and voting are open. electionPhase combines them.
 */
import type { Tables } from '@/types_db';
import { initiativeResponseOptions } from '@/utils/elections/initiative-options';
import type { ElectionType } from '@/types';
import { ELECTION_TYPE_CONFIGS } from '@/utils/election-types';

type ElectionRow = Tables<'elections'>;

/** Separate candidate and initiative periods: the election's setting, else its type's default (BUG-060). */
export function separatePeriods(e: Pick<ElectionRow, 'type' | 'enable_separate_voting_periods'>) {
  return e.enable_separate_voting_periods ?? ELECTION_TYPE_CONFIGS[e.type as ElectionType]?.defaultSeparateVotingPeriods ?? false;
}

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
  const separate = separatePeriods(e);
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
  candidateVotingOpen: boolean,
  /** The election's positions. Once the ballot is locked they carry the decisions made then. */
  positions?: Position[]
) {
  // Decided at lock, position by position: nothing is left to vote for.
  if (positions?.some((p) => p.unopposed_decision || p.vacant))
    return candidates.length > 0 && !positions.some((p) => positionOnBallot(p, candidates));
  const show = e.show_unopposed_status ?? ELECTION_TYPE_CONFIGS[e.type as ElectionType]?.defaultShowUnopposedStatus ?? true;
  if (!show || candidates.length === 0 || candidateVotingOpen) return false;
  const counts = new Map<string, number>();
  candidates.forEach((c) => counts.set(c.position, (counts.get(c.position) ?? 0) + 1));
  return Array.from(counts.values()).every((n) => n <= 1);
}

/**
 * Whether to announce the candidates as elected unopposed now: decided at the
 * lock position by position, or (for elections locked before that) only once
 * candidate voting has closed. Never during nominations (W26). Used by the
 * election page and the results API.
 */
export function electedUnopposedNow(
  e: PhaseInput & Pick<ElectionRow, 'type' | 'show_unopposed_status'>,
  candidates: { position: string }[],
  positions: Position[],
  now = Date.now()
) {
  const w = electionPhase(e, now);
  const decided = positions.some((p) => p.unopposed_decision || p.vacant);
  return electedUnopposed(e, candidates, w.candidateVotingOpen, positions) && (decided || now > Date.parse(w.candidateWindow.end));
}

export type Position = {
  position: string;
  description: string | null;
  display_order: number;
  /** How many people the position elects (ballot_positions.seats). */
  seats?: number;
  vacant?: boolean;
  /** Decided at lock when candidates <= seats. */
  unopposed_decision?: string | null;
};

/**
 * Whether members vote on a position: it has candidates, isn't vacant, and
 * wasn't elected unopposed at lock (D5). Withdrawn candidates still count:
 * they stay on the ballot, labelled, and can't be chosen.
 */
export function positionOnBallot(p: Position, candidates: { position: string }[]) {
  const count = candidates.filter((c) => c.position === p.position).length;
  if (p.vacant || count === 0) return false;
  return !(p.unopposed_decision === 'elect' && count <= (p.seats ?? 1));
}

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

/** Every configured position, including roles that do not have a candidate yet. */
export function positionCandidateGroups<P extends { position: string }, T extends { position: string }>(positions: P[], candidates: T[]) {
  const names = positions.map((position) => position.position);
  const otherNames = candidates.map((candidate) => candidate.position).filter((name) => !names.includes(name));
  return [...names, ...Array.from(new Set(otherNames))].map((name) => ({
    position: name,
    positionData: positions.find((position) => position.position === name),
    candidates: candidates.filter((candidate) => candidate.position === name)
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
  candidates: (Pick<Tables<'candidates'>, 'id' | 'position' | 'full_name' | 'bio'> & { withdrawn_at?: string | null })[];
  initiatives: Pick<Tables<'initiatives'>, 'id' | 'title' | 'description' | 'additional_info_url' | 'response_type' | 'response_options'>[];
}) {
  return {
    // Positions members vote on, each with its seats: vacant and
    // elected-unopposed positions are left off (positionOnBallot).
    positions: offerCandidates
      ? positions
          .filter((p) => positionOnBallot(p, candidates))
          .map((p) => ({
            position: p.position,
            description: p.description,
            seats: p.seats ?? 1,
            candidates: candidates
              .filter((c) => c.position === p.position)
              .map((c) => ({ id: c.id, name: c.full_name, detail: c.bio, withdrawn: !!c.withdrawn_at }))
          }))
      : [],
    initiatives: offerInitiatives
      ? initiatives.map((i) => ({ id: i.id, title: i.title, description: i.description, url: i.additional_info_url, options: initiativeResponseOptions(i.response_type, i.response_options) }))
      : []
  };
}

// ---------------------------------------------------------------------------
// Phase and state machine
// ---------------------------------------------------------------------------

export type ElectionPhase =
  | 'draft'
  | 'upcoming'
  | 'nominations_open'
  | 'review'
  | 'ballot_ready'
  | 'voting_open'
  | 'voting_closed'
  | 'certified'
  | 'results_published'
  | 'archived'
  | 'cancelled';

type Tone = 'green' | 'blue' | 'orange' | 'red' | 'neutral';

/** Status in words, never colour alone. Members see a certified election as closed until results are published. */
export const PHASE_LABEL: Record<ElectionPhase, { member: string; admin: string; tone: Tone }> = {
  draft: { member: 'Draft', admin: 'Draft', tone: 'neutral' },
  upcoming: { member: 'Upcoming', admin: 'Upcoming', tone: 'neutral' },
  nominations_open: { member: 'Nominations open', admin: 'Nominations open', tone: 'blue' },
  review: { member: 'Nominations closed', admin: 'Nominations review', tone: 'orange' },
  ballot_ready: { member: 'Upcoming', admin: 'Ballot locked', tone: 'neutral' },
  voting_open: { member: 'Voting open', admin: 'Voting open', tone: 'green' },
  voting_closed: { member: 'Voting closed', admin: 'Voting closed', tone: 'orange' },
  certified: { member: 'Voting closed', admin: 'Certified', tone: 'orange' },
  results_published: { member: 'Completed', admin: 'Results published', tone: 'neutral' },
  archived: { member: 'Archived', admin: 'Archived', tone: 'neutral' },
  cancelled: { member: 'Cancelled', admin: 'Cancelled', tone: 'red' }
};

type PhaseInput = Pick<
  ElectionRow,
  | 'status'
  | 'type'
  | 'nomination_start'
  | 'nomination_end'
  | 'start_date'
  | 'end_date'
  | 'enable_separate_voting_periods'
  | 'candidate_voting_start'
  | 'candidate_voting_end'
>;

/**
 * Listed under Past (website and app): results published, archived or
 * cancelled. An election stays current after voting closes, while its votes
 * are counted, until its results are out.
 */
export function isPastElection(e: { status: string | null }): boolean {
  return e.status === 'completed' || e.status === 'archived' || e.status === 'cancelled';
}

const within = (now: number, start: string | null, end: string | null) =>
  !!start && !!end && now >= Date.parse(start) && now <= Date.parse(end);

/**
 * Where an election stands. Voting is open only once the ballot is locked and
 * inside its window; the flags returned here are gated on that, so pass this
 * (not votingWindows) to ballotOffer. Windows include their edges.
 * Mirrors public.election_voting_open in the database.
 */
export function electionPhase(e: PhaseInput, now = Date.now()) {
  const w = votingWindows(e, now);
  const locked = e.status === 'ballot_locked';
  const nominationsOpen = e.status === 'scheduled' && within(now, e.nomination_start, e.nomination_end);
  const candidateVotingOpen = locked && w.candidateVotingOpen;
  const initiativeVotingOpen = locked && w.initiativeVotingOpen;
  const votingStart = Math.min(Date.parse(w.candidateWindow.start), Date.parse(e.start_date));
  const votingEnd = Math.max(Date.parse(w.candidateWindow.end), Date.parse(e.end_date));

  const phase: ElectionPhase = (() => {
    switch (e.status) {
      case 'draft':
      case 'certified':
      case 'archived':
      case 'cancelled':
        return e.status;
      case 'completed':
        return 'results_published';
      case 'scheduled':
        if (e.nomination_start && now < Date.parse(e.nomination_start)) return 'upcoming';
        return nominationsOpen ? 'nominations_open' : 'review';
      default: // ballot_locked
        if (now < votingStart) return 'ballot_ready';
        return now <= votingEnd ? 'voting_open' : 'voting_closed';
    }
  })();

  return {
    ...w,
    phase,
    label: PHASE_LABEL[phase],
    nominationsOpen,
    candidateVotingOpen,
    initiativeVotingOpen,
    votingOpen: candidateVotingOpen || initiativeVotingOpen,
    /** Every voting window has ended (whatever the status). */
    votingOver: now > votingEnd,
    /** Voting should have started but the ballot was never locked. */
    lockOverdue: e.status === 'scheduled' && now >= votingStart
  };
}

export type AdminAction =
  | 'publish'
  | 'delete_draft'
  | 'extend_nominations'
  | 'lock_ballot'
  | 'extend_voting'
  | 'cancel'
  | 'certify'
  | 'reopen_certification'
  | 'publish_results'
  | 'archive';

export type AdminContext = {
  /** Nominations still awaiting acceptance or review. */
  undecidedNominations: number;
  /** Initiative proposals waiting for review. */
  undecidedProposals?: number;
  /** Positions with no candidate that aren't marked vacant. */
  emptyPositions: string[];
  candidateCount: number;
  initiativeCount: number;
  positionCount: number;
  /** Ties without a certified run-off (Phase 5). */
  unresolvedTies?: number;
  /** A run-off: it has positions but no nominations window. */
  isRunoff?: boolean;
};

/**
 * What an admin may do now: true, or the reason it's blocked, in the words the
 * database uses when it refuses (election_* functions).
 */
export function adminActions(e: PhaseInput, ctx: AdminContext, now = Date.now()): Record<AdminAction, true | string> {
  const p = electionPhase(e, now);
  const guard = (ok: boolean, reason: string): true | string => (ok ? true : reason);
  const scheduledOrLocked = e.status === 'scheduled' || e.status === 'ballot_locked';
  const timeline = validateTimeline(e, { hasPositions: ctx.positionCount > 0 && !ctx.isRunoff, now });
  const firstError = Object.values(timeline.errors)[0];

  return {
    publish: guard(
      e.status === 'draft' && ctx.positionCount + ctx.initiativeCount > 0 && !firstError,
      e.status !== 'draft'
        ? 'Only a draft can be published.'
        : ctx.positionCount + ctx.initiativeCount === 0
          ? 'Add at least one position or initiative.'
          : (firstError ?? '')
    ),
    delete_draft: e.status === 'draft' ? true : 'Only a draft can be deleted. Cancel a published election instead.',
    extend_nominations: guard(
      e.status === 'scheduled' && !!e.nomination_end,
      'Nominations can be extended only before the ballot is locked.'
    ),
    lock_ballot: guard(
      e.status === 'scheduled' &&
        !p.nominationsOpen &&
        p.phase !== 'upcoming' &&
        ctx.undecidedNominations === 0 &&
        !ctx.undecidedProposals &&
        ctx.emptyPositions.length === 0 &&
        ctx.candidateCount + ctx.initiativeCount > 0,
      e.status !== 'scheduled'
        ? 'Only a scheduled election’s ballot can be locked.'
        : p.nominationsOpen || p.phase === 'upcoming'
          ? 'Nominations are still open.'
          : ctx.undecidedNominations > 0
            ? 'Some nominations haven’t been decided yet.'
            : ctx.undecidedProposals
              ? 'Some initiative proposals haven’t been decided yet.'
              : ctx.emptyPositions.length > 0
                ? `No candidates for: ${ctx.emptyPositions.join(', ')}. Mark them vacant or extend nominations.`
                : 'The ballot is empty.'
    ),
    extend_voting: guard(
      scheduledOrLocked && !p.votingOver,
      scheduledOrLocked ? 'Voting has already closed, so it can’t be extended.' : 'Voting can be extended only before results are certified.'
    ),
    cancel: guard(
      scheduledOrLocked,
      e.status === 'draft' ? 'Delete a draft instead.' : 'Only a published election that isn’t certified can be cancelled.'
    ),
    certify: guard(
      e.status === 'ballot_locked' && p.votingOver && !ctx.unresolvedTies,
      e.status !== 'ballot_locked'
        ? 'Only a locked ballot can be certified.'
        : !p.votingOver
          ? 'Voting hasn’t closed yet.'
          : 'Settle the ties with a run-off first.'
    ),
    reopen_certification: guard(e.status === 'certified', 'Only certified results that aren’t published can be reopened.'),
    publish_results: guard(e.status === 'certified', 'Certify the results before publishing them.'),
    archive: guard(e.status === 'completed', 'Only an election with published results can be archived.')
  };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

type TimelineInput = Pick<
  ElectionRow,
  | 'type'
  | 'nomination_start'
  | 'nomination_end'
  | 'start_date'
  | 'end_date'
  | 'enable_separate_voting_periods'
  | 'candidate_voting_start'
  | 'candidate_voting_end'
> & { results_date?: string | null };

type TimelineField =
  | 'nomination_start'
  | 'nomination_end'
  | 'start_date'
  | 'end_date'
  | 'candidate_voting_start'
  | 'candidate_voting_end'
  | 'results_date';

const NOTICE_DAYS = 30;

/**
 * The timeline's order: nominations, then voting, then results. Errors block
 * publishing; the warning (Art. IV §1's 30 days' notice, B9) doesn't.
 * The database refuses the same orders (election_publish, elections_timeline_order).
 */
export function validateTimeline(
  e: TimelineInput,
  { hasPositions, now = Date.now() }: { hasPositions: boolean; now?: number }
) {
  const errors: Partial<Record<TimelineField, string>> = {};
  const t = (v: string | null | undefined) => (v ? Date.parse(v) : NaN);
  const set = (f: TimelineField, msg: string) => (errors[f] ??= msg);

  const ns = t(e.nomination_start);
  const ne = t(e.nomination_end);
  const vs = t(e.start_date);
  const ve = t(e.end_date);
  const separate = separatePeriods(e);
  const cs = separate ? t(e.candidate_voting_start) : NaN;
  const ce = separate ? t(e.candidate_voting_end) : NaN;
  const rd = t(e.results_date);

  if (hasPositions) {
    if (isNaN(ns)) set('nomination_start', 'Set when nominations open.');
    if (isNaN(ne)) set('nomination_end', 'Set when nominations close.');
  }
  if (!isNaN(ns) && !isNaN(ne) && ne <= ns) set('nomination_end', 'Nominations must close after they open.');
  if (isNaN(vs)) set('start_date', 'Set when voting opens.');
  else if (vs <= now) set('start_date', 'Voting must start in the future.');
  if (isNaN(ve)) set('end_date', 'Set when voting closes.');
  else if (!isNaN(vs) && ve <= vs) set('end_date', 'Voting must close after it opens.');
  if (!isNaN(ne) && !isNaN(vs) && ne > vs) set('nomination_end', 'Nominations must close before voting opens.');

  if (!isNaN(cs) || !isNaN(ce)) {
    if (!isNaN(cs) && !isNaN(ne) && cs < ne) set('candidate_voting_start', 'Candidate voting must open after nominations close.');
    if (!isNaN(cs) && !isNaN(ce) && ce <= cs) set('candidate_voting_end', 'Candidate voting must close after it opens.');
  }
  if (!isNaN(rd)) {
    const lastClose = Math.max(isNaN(ve) ? -Infinity : ve, isNaN(ce) ? -Infinity : ce);
    if (rd < lastClose) set('results_date', 'Results come after voting closes.');
  }

  const firstOpen = Math.min(isNaN(vs) ? Infinity : vs, isNaN(cs) ? Infinity : cs);
  const warning =
    isFinite(firstOpen) && firstOpen - now < NOTICE_DAYS * 24 * 60 * 60 * 1000
      ? `Voting opens less than ${NOTICE_DAYS} days from now. The bylaws ask for 30 days’ notice of the annual meeting (Art. IV §1).`
      : null;

  return { errors, warning, valid: Object.keys(errors).length === 0 };
}

// ---------------------------------------------------------------------------
// Seattle time in forms
// ---------------------------------------------------------------------------

export const TIME_ZONE = 'America/Los_Angeles';

const localParts = (instant: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

/** An instant as the value of a datetime-local field, in Seattle time. */
export function toLocalInput(iso: string | null | undefined): string {
  return iso ? localParts(Date.parse(iso)) : '';
}

/**
 * A datetime-local value ("2026-12-01T23:59"), read as Seattle time, as a UTC
 * ISO string. A time skipped when clocks go forward is refused; a time that
 * happens twice when they go back is the first one (PDT).
 */
export function fromLocalInput(value: string): { iso: string } | { error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return { error: 'Enter a date and time.' };
  const [, y, mo, d, h, mi] = m.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Seattle is UTC-7 (PDT) or UTC-8 (PST); keep the offsets that read back as the same wall time.
  const matches = [7, 8].map((hours) => wall + hours * 3600_000).filter((instant) => localParts(instant) === value);
  if (matches.length === 0) return { error: 'That time doesn’t exist in Seattle: clocks skip it when daylight saving starts.' };
  return { iso: new Date(Math.min(...matches)).toISOString() };
}

// ---------------------------------------------------------------------------
// Admin list and overview
// ---------------------------------------------------------------------------

export type AdminTab = 'drafts' | 'upcoming' | 'nominations' | 'voting' | 'closed' | 'archived';

/** Which tab of Admin › Elections an election is listed under. */
export const ADMIN_TAB: Record<ElectionPhase, AdminTab> = {
  draft: 'drafts',
  upcoming: 'upcoming',
  ballot_ready: 'upcoming',
  nominations_open: 'nominations',
  review: 'nominations',
  voting_open: 'voting',
  voting_closed: 'closed',
  certified: 'closed',
  results_published: 'closed',
  archived: 'archived',
  cancelled: 'archived'
};

export type NextAction =
  | 'publish'
  | 'finish_setup'
  | 'preview'
  | 'review_nominations'
  | 'lock_ballot'
  | 'turnout'
  | 'certify'
  | 'publish_results'
  | 'archive';

/** The one primary action an election's phase calls for (plan §5), or null when there's nothing left to do. */
export function nextAction(
  phase: ElectionPhase,
  {
    canPublish,
    nominationsToReview,
    proposalsToReview = 0,
    ties = 0
  }: { canPublish: boolean; nominationsToReview: number; proposalsToReview?: number; ties?: number }
): { action: NextAction; label: string } | null {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const waiting = [
    nominationsToReview ? plural(nominationsToReview, 'nomination') : '',
    proposalsToReview ? plural(proposalsToReview, 'proposal') : ''
  ].filter(Boolean);
  const review = { action: 'review_nominations' as const, label: `Review ${waiting.join(' and ')}` };
  const toReview = nominationsToReview + proposalsToReview;
  switch (phase) {
    case 'draft':
      return canPublish ? { action: 'publish', label: 'Publish' } : { action: 'finish_setup', label: 'Finish setup' };
    case 'upcoming':
      return { action: 'preview', label: 'Preview' };
    case 'nominations_open':
      return toReview > 0 ? review : { action: 'preview', label: 'Preview' };
    case 'review':
      return toReview > 0 ? review : { action: 'lock_ballot', label: 'Lock ballot' };
    case 'ballot_ready':
      return { action: 'preview', label: 'Preview ballot' };
    case 'voting_open':
      return { action: 'turnout', label: 'View turnout' };
    case 'voting_closed':
      return ties > 0 ? { action: 'certify', label: 'Settle the tie' } : { action: 'certify', label: 'Certify results' };
    case 'certified':
      return { action: 'publish_results', label: 'Publish results' };
    case 'results_published':
      return { action: 'archive', label: 'Archive' };
    default:
      return null;
  }
}

/** The date that matters next in this phase, with what happens then. */
export function keyDate(
  e: PhaseInput & { results_date?: string | null; results_published_at?: string | null },
  phase: ElectionPhase
): { label: string; at: string } | null {
  const w = votingWindows(e);
  const votingStart = Date.parse(w.candidateWindow.start) < Date.parse(e.start_date) ? w.candidateWindow.start : e.start_date;
  const votingEnd = Date.parse(w.candidateWindow.end) > Date.parse(e.end_date) ? w.candidateWindow.end : e.end_date;
  switch (phase) {
    case 'draft':
    case 'review':
    case 'ballot_ready':
      return { label: 'Voting opens', at: votingStart };
    case 'upcoming':
      return e.nomination_start ? { label: 'Nominations open', at: e.nomination_start } : { label: 'Voting opens', at: votingStart };
    case 'nominations_open':
      return { label: 'Nominations close', at: e.nomination_end! };
    case 'voting_open':
      return { label: 'Voting closes', at: votingEnd };
    case 'voting_closed':
    case 'certified':
      return e.results_date ? { label: 'Results due', at: e.results_date } : { label: 'Voting closed', at: votingEnd };
    case 'results_published':
      return e.results_published_at ? { label: 'Results published', at: e.results_published_at } : null;
    default:
      return null;
  }
}

const shiftDay = (localDate: string, days: number) => {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/**
 * A starting timeline for a new draft, in Seattle time: nominations for two
 * weeks, then voting 45 days out (past the 30 days' notice, B9) for the type's
 * typical length, results the next day. Admins change it in the Timeline step.
 */
export function defaultTimeline(type: ElectionType, now = Date.now()) {
  const today = toLocalInput(new Date(now).toISOString()).slice(0, 10);
  const days = ELECTION_TYPE_CONFIGS[type]?.typicalDurationDays ?? 14;
  const at = (date: string, time: string) => (fromLocalInput(`${date}T${time}`) as { iso: string }).iso;
  const voteDay = shiftDay(today, 45);
  const endDay = shiftDay(voteDay, days);
  return {
    nomination_start: at(shiftDay(voteDay, -21), '09:00'),
    nomination_end: at(shiftDay(voteDay, -7), '23:59'),
    start_date: at(voteDay, '09:00'),
    end_date: at(endDay, '20:00'),
    results_date: at(shiftDay(endDay, 1), '12:00')
  };
}

// ---------------------------------------------------------------------------
// Nominations
// ---------------------------------------------------------------------------

export type NominationStatus = 'awaiting_acceptance' | 'submitted' | 'approved' | 'rejected' | 'declined' | 'withdrawn';

/** Nomination statuses in words, for the nominee, the nominator and admins. */
export const NOMINATION_LABEL: Record<NominationStatus, { label: string; tone: Tone }> = {
  awaiting_acceptance: { label: 'Waiting for an answer', tone: 'orange' },
  submitted: { label: 'Waiting for review', tone: 'blue' },
  approved: { label: 'On the ballot', tone: 'green' },
  rejected: { label: 'Not approved', tone: 'red' },
  declined: { label: 'Declined', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' }
};

// ---------------------------------------------------------------------------
// Result words (W17): final once voting is over, from the certified outcome
// when there is one.
// ---------------------------------------------------------------------------

const CANDIDATE_OUTCOME_WORD: Record<string, string | null> = {
  elected: 'Elected',
  elected_unopposed: 'Elected unopposed',
  withdrawn: 'Withdrawn',
  runoff: 'Tied: run-off',
  not_elected: null
};

/**
 * The badge for a candidate: the certified outcome; otherwise (elections
 * certified before this) the top candidate, "Leading" while voting is open
 * and "Elected" once it's closed.
 */
export function candidateResultWord({
  outcome,
  isTop,
  votes,
  votingOpen
}: {
  outcome?: string | null;
  isTop: boolean;
  votes: number;
  votingOpen: boolean;
}): string | null {
  if (outcome) return CANDIDATE_OUTCOME_WORD[outcome] ?? null;
  if (!isTop || votes === 0) return null;
  return votingOpen ? 'Leading' : 'Elected';
}

/** The badge for an initiative, with its tone. */
export function initiativeResultWord({
  outcome,
  note,
  yes,
  no,
  votingOpen
}: {
  outcome?: string | null;
  note?: string | null;
  yes: number;
  no: number;
  votingOpen: boolean;
}): { word: string; tone: Tone } {
  if (outcome) {
    if (outcome === 'passed') return { word: 'Passed', tone: 'green' };
    if (note === 'Tied') return { word: 'Tied', tone: 'neutral' };
    if (note === 'No Yes or No votes') return { word: 'No votes', tone: 'neutral' };
    return { word: 'Not passed', tone: 'red' };
  }
  if (yes + no === 0) return { word: 'No votes', tone: 'neutral' };
  if (yes === no) return { word: 'Tied', tone: 'neutral' };
  if (votingOpen) return yes > no ? { word: 'Currently supported', tone: 'green' } : { word: 'Currently opposed', tone: 'red' };
  return yes > no ? { word: 'Supported', tone: 'green' } : { word: 'Opposed', tone: 'red' };
}

// ---------------------------------------------------------------------------
// Date changes, for telling members
// ---------------------------------------------------------------------------

const DATE_FIELDS = [
  ['nomination_start', 'Nominations open'],
  ['nomination_end', 'Nominations close'],
  ['start_date', 'Voting opens'],
  ['end_date', 'Voting closes'],
  ['candidate_voting_start', 'Candidate voting opens'],
  ['candidate_voting_end', 'Candidate voting closes'],
  ['results_date', 'Results expected']
] as const;
export type DateField = (typeof DATE_FIELDS)[number][0];

/**
 * The dates that changed, in timeline order, with their words. Instants are
 * compared, not strings: the database and the form spell the same moment
 * differently.
 */
export function dateChanges(
  before: Partial<Record<DateField, string | null>>,
  after: Partial<Record<DateField, string | null>>
): { field: DateField; label: string; from: string | null; to: string | null }[] {
  const instant = (v: string | null | undefined) => (v ? Date.parse(v) : null);
  return DATE_FIELDS.filter(([field]) => field in after && instant(before[field]) !== instant(after[field])).map(([field, label]) => ({
    field,
    label,
    from: before[field] ?? null,
    to: after[field] ?? null
  }));
}
