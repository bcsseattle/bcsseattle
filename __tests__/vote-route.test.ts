/** POST /api/elections/[id]/vote: request parsing and how handler errors map to HTTP statuses. */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/elections/[id]/vote/route';
import { submitCombinedVotes } from '@/utils/elections/handlers';

jest.mock('next/headers', () => ({ headers: async () => new Headers() }));
jest.mock('@/utils/elections/handlers', () => ({ submitCombinedVotes: jest.fn(), getVotingStatus: jest.fn() }));

const submit = submitCombinedVotes as jest.Mock;
const post = (body: string) =>
  POST(new NextRequest('http://localhost/api/elections/e1/vote', { method: 'POST', body }), {
    params: Promise.resolve({ id: 'e1' })
  });
const ballot = JSON.stringify({ candidateVotes: [{ candidateId: 'c1', position: 'President' }] });

beforeEach(() => submit.mockReset());

it('rejects a body that is not JSON', async () => {
  const res = await post('not json');
  expect(res.status).toBe(400);
  expect(submit).not.toHaveBeenCalled();
});

it('rejects an empty ballot', async () => {
  const res = await post('{}');
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: 'At least one vote (candidate or initiative) is required' });
});

it('passes the votes to the handler and returns the confirmation', async () => {
  submit.mockResolvedValue({ success: true, confirmationCode: 'ABC', votesCast: 1 });
  const res = await post(ballot);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ success: true, confirmationCode: 'ABC', votesCast: 1 });
  expect(submit).toHaveBeenCalledWith([{ candidateId: 'c1', position: 'President' }], [], 'e1', expect.any(Headers));
});

it.each([
  ['Authentication required', 401],
  ['Election not found', 404],
  ['You have already voted in this election', 400]
])('maps "%s" to %i', async (error, status) => {
  submit.mockResolvedValue({ success: false, error });
  const res = await post(ballot);
  expect(res.status).toBe(status);
  expect(await res.json()).toEqual({ error });
});

it('returns 500 when the handler throws', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  submit.mockRejectedValue(new Error('down'));
  expect((await post(ballot)).status).toBe(500);
});
