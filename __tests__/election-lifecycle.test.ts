import {
  adminActions,
  electionPhase,
  fromLocalInput,
  toLocalInput,
  validateTimeline,
  type AdminContext
} from '@/utils/elections/rules';
import type { Tables } from '@/types_db';

const at = (iso: string) => Date.parse(iso);
const ms = 1;

type Row = Pick<
  Tables<'elections'>,
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

const base: Row = {
  status: 'scheduled',
  type: 'leadership',
  nomination_start: '2026-12-01T08:00:00.000Z',
  nomination_end: '2026-12-08T08:00:00.000Z',
  start_date: '2026-12-10T08:00:00.000Z',
  end_date: '2026-12-20T08:00:00.000Z',
  enable_separate_voting_periods: false,
  candidate_voting_start: null,
  candidate_voting_end: null
};
const locked: Row = { ...base, status: 'ballot_locked' };

describe('electionPhase', () => {
  it('takes the admin decisions from status', () => {
    expect(electionPhase({ ...base, status: 'draft' }).phase).toBe('draft');
    expect(electionPhase({ ...base, status: 'certified' }).phase).toBe('certified');
    expect(electionPhase({ ...base, status: 'completed' }).phase).toBe('results_published');
    expect(electionPhase({ ...base, status: 'archived' }).phase).toBe('archived');
    expect(electionPhase({ ...base, status: 'cancelled' }).phase).toBe('cancelled');
  });

  it('opens nominations from start to end, both included', () => {
    expect(electionPhase(base, at(base.nomination_start!) - ms).phase).toBe('upcoming');
    expect(electionPhase(base, at(base.nomination_start!)).nominationsOpen).toBe(true);
    expect(electionPhase(base, at(base.nomination_end!)).nominationsOpen).toBe(true);
    const after = electionPhase(base, at(base.nomination_end!) + ms);
    expect(after.nominationsOpen).toBe(false);
    expect(after.phase).toBe('review');
  });

  it('never opens nominations outside scheduled', () => {
    expect(electionPhase({ ...base, status: 'draft' }, at(base.nomination_start!)).nominationsOpen).toBe(false);
    expect(electionPhase(locked, at(base.nomination_start!)).nominationsOpen).toBe(false);
  });

  it('is in review when there is no nominations window', () => {
    expect(electionPhase({ ...base, nomination_start: null, nomination_end: null }, at('2026-12-02T00:00:00Z')).phase).toBe('review');
  });

  it('opens voting only once the ballot is locked, edges included', () => {
    expect(electionPhase(locked, at(base.start_date) - ms).phase).toBe('ballot_ready');
    expect(electionPhase(locked, at(base.start_date)).votingOpen).toBe(true);
    expect(electionPhase(locked, at(base.end_date)).votingOpen).toBe(true);
    const after = electionPhase(locked, at(base.end_date) + ms);
    expect(after.phase).toBe('voting_closed');
    expect(after.votingOpen).toBe(false);
    expect(after.votingOver).toBe(true);
  });

  it('keeps voting shut when the ballot was never locked', () => {
    const p = electionPhase(base, at('2026-12-12T00:00:00Z'));
    expect(p.votingOpen).toBe(false);
    expect(p.lockOverdue).toBe(true);
    expect(p.phase).toBe('review');
  });

  describe('separate candidate and initiative windows', () => {
    const separate: Row = {
      ...locked,
      enable_separate_voting_periods: true,
      candidate_voting_start: '2026-12-10T08:00:00.000Z',
      candidate_voting_end: '2026-12-12T08:00:00.000Z'
    };

    it('tracks each window on its own', () => {
      const both = electionPhase(separate, at('2026-12-11T00:00:00Z'));
      expect(both.candidateVotingOpen).toBe(true);
      expect(both.initiativeVotingOpen).toBe(true);

      const initiativesOnly = electionPhase(separate, at(separate.candidate_voting_end!) + ms);
      expect(initiativesOnly.candidateVotingOpen).toBe(false);
      expect(initiativesOnly.initiativeVotingOpen).toBe(true);
      expect(initiativesOnly.phase).toBe('voting_open');
    });

    it('closes voting only after both windows end', () => {
      const later = { ...separate, candidate_voting_end: '2026-12-25T08:00:00.000Z' };
      expect(electionPhase(later, at(base.end_date) + ms).phase).toBe('voting_open');
      expect(electionPhase(later, at(later.candidate_voting_end) + ms).phase).toBe('voting_closed');
    });

    it('uses the type default when the setting is null (BUG-060)', () => {
      const p = electionPhase({ ...separate, enable_separate_voting_periods: null }, at('2026-12-15T00:00:00Z'));
      expect(p.separate).toBe(true);
      expect(p.candidateVotingOpen).toBe(false);
    });
  });

  it('keeps inclusive edges across the fall daylight saving change', () => {
    // Opens 31 Oct 20:00 PDT, closes 1 Nov 20:00 PST: 25 hours, not 24.
    const open = fromLocalInput('2026-10-31T20:00') as { iso: string };
    const close = fromLocalInput('2026-11-01T20:00') as { iso: string };
    expect(at(close.iso) - at(open.iso)).toBe(25 * 3600_000);
    const e = { ...base, nomination_start: open.iso, nomination_end: close.iso };
    expect(electionPhase(e, at(open.iso)).nominationsOpen).toBe(true);
    expect(electionPhase(e, at(close.iso)).nominationsOpen).toBe(true);
    expect(electionPhase(e, at(close.iso) + ms).nominationsOpen).toBe(false);
  });

  it('keeps inclusive edges across the spring daylight saving change', () => {
    const open = fromLocalInput('2027-03-13T12:00') as { iso: string };
    const close = fromLocalInput('2027-03-14T12:00') as { iso: string };
    expect(at(close.iso) - at(open.iso)).toBe(23 * 3600_000);
    const e = { ...locked, start_date: open.iso, end_date: close.iso };
    expect(electionPhase(e, at(open.iso)).votingOpen).toBe(true);
    expect(electionPhase(e, at(close.iso)).votingOpen).toBe(true);
    expect(electionPhase(e, at(close.iso) + ms).votingOpen).toBe(false);
  });
});

describe('adminActions', () => {
  const ready: AdminContext = {
    adminIsStanding: false,
    undecidedNominations: 0,
    emptyPositions: [],
    candidateCount: 3,
    initiativeCount: 1,
    positionCount: 2
  };
  const now = at('2026-11-10T00:00:00Z');
  const draft = { ...base, status: 'draft' as const };

  it('publishes a complete draft only', () => {
    expect(adminActions(draft, ready, now).publish).toBe(true);
    expect(adminActions(draft, { ...ready, positionCount: 0, initiativeCount: 0 }, now).publish).toBe(
      'Add at least one position or initiative.'
    );
    expect(adminActions({ ...draft, nomination_start: null }, ready, now).publish).toBe('Set when nominations open.');
    expect(adminActions(base, ready, now).publish).toBe('Only a draft can be published.');
  });

  it('deletes drafts and cancels published elections', () => {
    expect(adminActions(draft, ready, now).delete_draft).toBe(true);
    expect(adminActions(draft, ready, now).cancel).toBe('Delete a draft instead.');
    expect(adminActions(base, ready, now).cancel).toBe(true);
    expect(adminActions(locked, ready, now).cancel).toBe(true);
    expect(adminActions({ ...base, status: 'certified' }, ready, now).cancel).toMatch(/isn’t certified/);
  });

  describe('lock ballot', () => {
    const afterNominations = at(base.nomination_end!) + ms;
    it('waits for nominations to close and be decided', () => {
      expect(adminActions(base, ready, at(base.nomination_end!)).lock_ballot).toBe('Nominations are still open.');
      expect(adminActions(base, ready, at(base.nomination_start!) - ms).lock_ballot).toBe('Nominations are still open.');
      expect(adminActions(base, { ...ready, undecidedNominations: 2 }, afterNominations).lock_ballot).toBe(
        'Some nominations haven’t been decided yet.'
      );
    });
    it('needs every position filled or vacant, and something on the ballot', () => {
      expect(adminActions(base, { ...ready, emptyPositions: ['Treasurer'] }, afterNominations).lock_ballot).toMatch(/Treasurer/);
      expect(adminActions(base, { ...ready, candidateCount: 0, initiativeCount: 0 }, afterNominations).lock_ballot).toBe(
        'The ballot is empty.'
      );
      expect(adminActions(base, ready, afterNominations).lock_ballot).toBe(true);
    });
  });

  it('extends voting until it closes', () => {
    expect(adminActions(locked, ready, at(base.end_date)).extend_voting).toBe(true);
    expect(adminActions(locked, ready, at(base.end_date) + ms).extend_voting).toMatch(/already closed/);
  });

  it('certifies after voting, with ties settled', () => {
    expect(adminActions(locked, ready, at(base.end_date)).certify).toBe('Voting hasn’t closed yet.');
    expect(adminActions(locked, ready, at(base.end_date) + ms).certify).toBe(true);
    expect(adminActions(locked, { ...ready, unresolvedTies: 1 }, at(base.end_date) + ms).certify).toMatch(/run-off/);
  });

  it('publishes, reopens and archives in order', () => {
    const certified = { ...base, status: 'certified' as const };
    expect(adminActions(certified, ready, now).publish_results).toBe(true);
    expect(adminActions(certified, ready, now).reopen_certification).toBe(true);
    expect(adminActions(locked, ready, now).publish_results).toMatch(/Certify/);
    expect(adminActions({ ...base, status: 'completed' }, ready, now).archive).toBe(true);
    expect(adminActions({ ...base, status: 'completed' }, ready, now).reopen_certification).toMatch(/aren’t published/);
  });

  it('blocks an admin who is standing in the election (D7)', () => {
    const standing = { ...ready, adminIsStanding: true };
    const actions = adminActions(locked, standing, at(base.end_date) + ms);
    expect(actions.certify).toMatch(/standing in this election/);
    expect(actions.cancel).toMatch(/standing in this election/);
    expect(adminActions(base, standing, at(base.nomination_end!) + ms).lock_ballot).toMatch(/standing/);
  });
});

describe('validateTimeline', () => {
  const now = at('2026-10-01T00:00:00Z');
  const opts = { hasPositions: true, now };

  it('accepts nominations, then voting, then results', () => {
    const r = validateTimeline({ ...base, results_date: '2026-12-21T08:00:00.000Z' }, opts);
    expect(r.valid).toBe(true);
    expect(r.warning).toBeNull();
  });

  it('needs a nominations window when there are positions', () => {
    const r = validateTimeline({ ...base, nomination_start: null, nomination_end: null }, opts);
    expect(r.errors.nomination_start).toBeDefined();
    expect(validateTimeline({ ...base, nomination_start: null, nomination_end: null }, { ...opts, hasPositions: false }).valid).toBe(true);
  });

  it('refuses each out-of-order date', () => {
    expect(validateTimeline({ ...base, nomination_end: base.nomination_start }, opts).errors.nomination_end).toMatch(/after they open/);
    expect(validateTimeline({ ...base, nomination_end: '2026-12-11T00:00:00Z' }, opts).errors.nomination_end).toMatch(/before voting/);
    expect(validateTimeline({ ...base, end_date: base.start_date }, opts).errors.end_date).toMatch(/after it opens/);
    expect(validateTimeline(base, { ...opts, now: at(base.start_date) }).errors.start_date).toMatch(/future/);
    expect(validateTimeline({ ...base, results_date: '2026-12-19T00:00:00Z' }, opts).errors.results_date).toBeDefined();
  });

  it('checks the candidate window only when separate periods are on', () => {
    const early = { candidate_voting_start: '2026-12-05T00:00:00Z', candidate_voting_end: '2026-12-12T00:00:00Z' };
    expect(validateTimeline({ ...base, ...early, enable_separate_voting_periods: true }, opts).errors.candidate_voting_start).toMatch(
      /after nominations close/
    );
    expect(validateTimeline({ ...base, ...early, enable_separate_voting_periods: false }, opts).valid).toBe(true);
  });

  it('warns, without blocking, under 30 days of notice (B9)', () => {
    const r = validateTimeline(base, { ...opts, now: at('2026-11-15T00:00:00Z') });
    expect(r.valid).toBe(true);
    expect(r.warning).toMatch(/30 days/);
  });
});

describe('Seattle time in forms', () => {
  it('reads PST and PDT', () => {
    expect(fromLocalInput('2026-12-01T23:59')).toEqual({ iso: '2026-12-02T07:59:00.000Z' });
    expect(fromLocalInput('2026-07-01T09:00')).toEqual({ iso: '2026-07-01T16:00:00.000Z' });
  });

  it('refuses a time skipped when clocks go forward', () => {
    expect(fromLocalInput('2027-03-14T02:30')).toHaveProperty('error');
  });

  it('takes the first of a time that happens twice when clocks go back (PDT)', () => {
    expect(fromLocalInput('2026-11-01T01:30')).toEqual({ iso: '2026-11-01T08:30:00.000Z' });
  });

  it('refuses anything that isn’t a datetime-local value', () => {
    expect(fromLocalInput('')).toHaveProperty('error');
    expect(fromLocalInput('2026-12-01')).toHaveProperty('error');
  });

  it('round-trips through the form field', () => {
    for (const iso of ['2026-12-02T07:59:00.000Z', '2026-07-01T16:00:00.000Z', '2026-11-01T08:30:00.000Z']) {
      expect(fromLocalInput(toLocalInput(iso))).toEqual({ iso });
    }
    expect(toLocalInput(null)).toBe('');
  });

  it('can’t tell the second 01:30 on the night clocks go back from the first', () => {
    // A datetime-local field has no zone, so the PST 01:30 reads back as the PDT one.
    expect(toLocalInput('2026-11-01T09:30:00.000Z')).toBe('2026-11-01T01:30');
    expect(fromLocalInput('2026-11-01T01:30')).toEqual({ iso: '2026-11-01T08:30:00.000Z' });
  });
});
