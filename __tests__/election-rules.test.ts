import { ballotOffer, electedUnopposed, positionOrder, votingWindows } from '@/utils/elections/rules';

const at = (iso: string) => Date.parse(iso);
const election = {
  type: 'leadership' as const,
  start_date: '2026-11-01T00:00:00+00:00',
  end_date: '2026-11-10T00:00:00+00:00',
  enable_separate_voting_periods: null,
  candidate_voting_start: '2026-11-02T00:00:00+00:00',
  candidate_voting_end: '2026-11-05T00:00:00+00:00',
  show_unopposed_status: null
};

describe('votingWindows', () => {
  it('includes both edges', () => {
    expect(votingWindows(election, at(election.start_date)).initiativeVotingOpen).toBe(true);
    expect(votingWindows(election, at(election.end_date)).initiativeVotingOpen).toBe(true);
    expect(votingWindows(election, at(election.end_date) + 1).closed).toBe(true);
  });

  it('uses the candidate window when separate periods are on (the leadership default)', () => {
    const w = votingWindows(election, at('2026-11-07T00:00:00+00:00'));
    expect(w.separate).toBe(true);
    expect(w.candidateVotingOpen).toBe(false);
    expect(w.votingOpen).toBe(true);
  });

  it('ignores the candidate dates when separate periods are off', () => {
    const w = votingWindows({ ...election, enable_separate_voting_periods: false }, at('2026-11-07T00:00:00+00:00'));
    expect(w.candidateVotingOpen).toBe(true);
    expect(w.candidateWindow.end).toBe(election.end_date);
  });
});

describe('electedUnopposed', () => {
  const one = [{ position: 'President' }, { position: 'Treasurer' }];
  it('only after candidate voting, with one candidate per position', () => {
    expect(electedUnopposed(election, one, false)).toBe(true);
    expect(electedUnopposed(election, one, true)).toBe(false);
    expect(electedUnopposed(election, [...one, { position: 'President' }], false)).toBe(false);
    expect(electedUnopposed(election, [], false)).toBe(false);
  });
  it('never when the election turns it off', () => {
    expect(electedUnopposed({ ...election, show_unopposed_status: false }, one, false)).toBe(false);
  });
});

describe('ballotOffer', () => {
  it('offers only the open, unvoted parts', () => {
    const windows = { candidateVotingOpen: true, initiativeVotingOpen: true };
    const base = { windows, votedCandidates: false, votedInitiatives: true, electedUnopposed: false, candidateCount: 2, initiativeCount: 1 };
    expect(ballotOffer(base)).toEqual({ offerCandidates: true, offerInitiatives: false });
    expect(ballotOffer({ ...base, candidateCount: 0 }).offerCandidates).toBe(false);
  });
});

describe('positionOrder', () => {
  it('prefers stored positions, then the type defaults, then the candidates', () => {
    const stored = [{ position: 'Chair', description: null, display_order: 1 }];
    expect(positionOrder('leadership', stored, [])).toBe(stored);
    expect(positionOrder('leadership', [], [])[0].position).toBe('President');
    expect(positionOrder('initiative', null, [{ position: 'Scribe' }])).toEqual([
      { position: 'Scribe', description: '', display_order: 1 }
    ]);
  });
});
