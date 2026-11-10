/**
 * The vote checks in submitCombinedVotes, with Supabase faked per table.
 * The real database (RLS, constraints, the full ballot) is covered by the e2e suite.
 */
import { submitCombinedVotes } from '@/utils/elections/handlers';
import { currentUserIsActiveMember } from '@/utils/election-config';

type Result = { data: unknown; error: unknown };
let results: Record<string, Result>;
let inserts: Record<string, unknown[]>;
let user: { id: string } | null;

/** A query on `table`: every builder method chains, and awaiting it gives results[table]. */
function query(table: string): any {
  const q: any = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'then') {
          const r = results[table] ?? { data: null, error: null };
          return (ok: any, fail: any) => Promise.resolve(r).then(ok, fail);
        }
        if (prop === 'insert') return (rows: unknown) => ((inserts[table] ??= []).push(rows), q);
        return () => q;
      }
    }
  );
  return q;
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: query
  })
}));
jest.mock('@/utils/supabase/admin', () => ({ supabaseAdmin: { from: query }, createCandidate: jest.fn() }));
jest.mock('@/utils/election-config', () => ({
  currentUserIsActiveMember: jest.fn(),
  isCandidateVotingOpen: jest.fn()
}));

const ELECTION = 'e1';
const hour = 3_600_000;
const open = {
  id: ELECTION,
  status: 'ballot_locked',
  type: 'initiative',
  start_date: new Date(Date.now() - hour).toISOString(),
  end_date: new Date(Date.now() + hour).toISOString()
};
const president = { candidateId: 'c1', position: 'ignored-from-request' };
const yes = { initiativeId: 'i1', vote: 'yes' as const };

beforeEach(() => {
  user = { id: 'u1' };
  inserts = {};
  (currentUserIsActiveMember as jest.Mock).mockResolvedValue(true);
  results = {
    elections: { data: open, error: null },
    election_voters: { data: { user_id: 'u1' }, error: null },
    votes: { data: [], error: null },
    candidates: { data: [{ id: 'c1', position: 'President' }], error: null },
    initiatives: { data: [{ id: 'i1' }], error: null }
  };
});

const vote = (candidates = [president], initiatives: { initiativeId: string; vote: any }[] = [yes], headers?: Headers) =>
  submitCombinedVotes(candidates, initiatives, ELECTION, headers);

describe('submitCombinedVotes', () => {
  it('records the votes and returns a confirmation code', async () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'jest' });
    const result = await vote([president], [yes], headers);

    expect(result).toEqual({ success: true, confirmationCode: expect.stringMatching(/^[0-9A-F]{32}$/), votesCast: 2 });
    const [rows] = inserts.votes as any[][];
    expect(rows).toEqual([
      expect.objectContaining({ user_id: 'u1', election_id: ELECTION, candidate_id: 'c1', ip_address: '203.0.113.7', user_agent: 'jest' }),
      expect.objectContaining({ user_id: 'u1', election_id: ELECTION, initiative_id: 'i1', vote_value: 'yes' })
    ]);
    expect(inserts.vote_confirmations).toEqual([expect.objectContaining({ votes_cast: 2, confirmation_code: result.confirmationCode })]);
  });

  it('requires sign-in', async () => {
    user = null;
    expect(await vote()).toEqual({ success: false, error: 'Authentication required' });
  });

  it('only lets approved, active members vote (BUG-007)', async () => {
    (currentUserIsActiveMember as jest.Mock).mockResolvedValue(false);
    expect((await vote()).error).toMatch(/approved members/);
  });

  it('rejects an unknown election', async () => {
    results.elections = { data: null, error: { message: 'no rows' } };
    expect((await vote()).error).toBe('Election not found');
  });

  it.each([
    ['not started', { start_date: new Date(Date.now() + hour).toISOString() }],
    ['ended', { end_date: new Date(Date.now() - hour).toISOString() }]
  ])('rejects voting when the election has %s', async (_, dates) => {
    results.elections = { data: { ...open, ...dates }, error: null };
    expect((await vote()).error).toMatch(/not currently open/);
  });

  it('rejects voting before the ballot is locked', async () => {
    results.elections = { data: { ...open, status: 'scheduled' }, error: null };
    expect((await vote()).error).toMatch(/not currently open/);
  });

  it('rejects a member who isn\'t on the voter roll (B11)', async () => {
    results.election_voters = { data: null, error: null };
    expect((await vote()).error).toMatch(/voter roll/);
    expect(inserts.votes).toBeUndefined();
  });

  it('rejects a second ballot from the same member (BUG-016)', async () => {
    results.votes = { data: [{ id: 'earlier-vote' }], error: null };
    expect((await vote()).error).toMatch(/already voted/);
    expect(inserts.votes).toBeUndefined();
  });

  it('rejects two candidates for the same position, using positions from the database (BUG-011)', async () => {
    results.candidates = { data: [{ id: 'c1', position: 'President' }, { id: 'c2', position: 'President' }], error: null };
    const result = await vote([
      { candidateId: 'c1', position: 'President' },
      { candidateId: 'c2', position: 'Treasurer' }
    ]);
    expect(result.error).toMatch(/multiple candidates in the same position/);
  });

  it('rejects a candidate from another election', async () => {
    results.candidates = { data: [], error: null };
    expect((await vote()).error).toBe('Invalid candidate IDs: c1');
  });

  it('rejects an initiative vote other than yes, no or abstain (BUG-052)', async () => {
    expect((await vote([], [{ initiativeId: 'i1', vote: true }])).error).toMatch(/yes, no or abstain/);
  });

  it('rejects two votes on the same initiative', async () => {
    expect((await vote([], [yes, { initiativeId: 'i1', vote: 'no' }])).error).toMatch(/same initiative twice/);
  });

  it('rejects an initiative from another election', async () => {
    results.initiatives = { data: [], error: null };
    expect((await vote([], [yes])).error).toBe('Invalid initiative for this election');
  });

  it('reports a failed insert instead of a confirmation', async () => {
    let calls = 0;
    // The first votes query is the already-voted check; the second is the insert.
    Object.defineProperty(results, 'votes', {
      get: () => (++calls === 1 ? { data: [], error: null } : { data: null, error: { message: 'boom' } })
    });
    expect(await vote()).toEqual({ success: false, error: 'Failed to record votes' });
    expect(inserts.vote_confirmations).toBeUndefined();
  });
});
