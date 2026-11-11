/** GET /api/cron/election-reminders: who gets which reminder, once a day. */
const NOW = Date.parse('2026-11-20T17:00:00Z');
const hours = (h: number) => new Date(NOW + h * 3600_000).toISOString();
const election = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Election ${id}`,
  type: 'initiative',
  status: 'ballot_locked',
  is_active: true,
  start_date: hours(-100),
  end_date: hours(100),
  enable_separate_voting_periods: false,
  candidate_voting_start: null,
  candidate_voting_end: null,
  nomination_start: null,
  nomination_end: null,
  ...overrides
});

const data = {
  elections: [] as ReturnType<typeof election>[],
  members: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }],
  voted: [] as { user_id: string }[]
};
const sendPush = jest.fn(async () => ({ devices: 0, removed: 0 }));
jest.mock('@/utils/push', () => ({ sendPush: (...args: unknown[]) => sendPush(...(args as [])) }));
const notify = jest.fn(async () => 0);
jest.mock('@/utils/elections/notify', () => ({ notify: (...args: unknown[]) => notify(...(args as [])) }));
jest.mock('@/utils/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const rows = table === 'elections' ? data.elections : table === 'members' ? data.members : data.voted;
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'not']) query[method] = () => query;
      query.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
      return query;
    }
  }
}));

import { GET } from '@/app/api/cron/election-reminders/route';

const cron = (secret = 'cron-secret') => GET(new Request('http://localhost/x', { headers: { authorization: `Bearer ${secret}` } }));

beforeAll(() => {
  process.env.CRON_SECRET = 'cron-secret';
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
beforeEach(() => {
  sendPush.mockClear();
  data.voted = [];
});

it('needs the cron secret', async () => {
  expect((await cron('wrong')).status).toBe(401);
});

it('announces voting that opened in the last day, to every active member', async () => {
  data.elections = [election('opened', { start_date: hours(-3) }), election('opened-long-ago', { start_date: hours(-30) })];
  await cron();
  expect(sendPush).toHaveBeenCalledTimes(1);
  expect(sendPush).toHaveBeenCalledWith(['u1', 'u2', 'u3'], {
    title: 'Voting is open: Election opened',
    body: 'Cast your ballot by 24 Nov 2026, 13:00 PST.',
    url: '/elections/view/?id=opened'
  });
});

it('reminds only members who have not voted, on the last day', async () => {
  data.elections = [election('closing', { end_date: hours(5) })];
  data.voted = [{ user_id: 'u2' }];
  await cron();
  expect(sendPush).toHaveBeenCalledWith(['u1', 'u3'], expect.objectContaining({ title: 'Last day to vote: Election closing' }));
});

it('counts the candidate window when voting periods are separate', async () => {
  data.elections = [
    election('separate', {
      type: 'leadership',
      enable_separate_voting_periods: true,
      candidate_voting_start: hours(-2),
      candidate_voting_end: hours(200),
      start_date: hours(-50)
    })
  ];
  await cron();
  expect(sendPush).toHaveBeenCalledWith(['u1', 'u2', 'u3'], expect.objectContaining({ title: 'Voting is open: Election separate' }));
});

it('announces nominations that opened in the last day', async () => {
  data.elections = [
    election('noms', { status: 'scheduled', start_date: hours(200), end_date: hours(300), nomination_start: hours(-1), nomination_end: hours(72) })
  ];
  await cron();
  expect(sendPush).toHaveBeenCalledWith(['u1', 'u2', 'u3'], {
    title: 'Nominations are open: Election noms',
    body: 'Nominate by 23 Nov 2026, 09:00 PST.',
    url: '/elections/view/?id=noms'
  });
});

it('sends nothing for inactive elections or quiet days', async () => {
  data.elections = [election('inactive', { is_active: false, start_date: hours(-3) }), election('quiet')];
  const body = await (await cron()).json();
  expect(sendPush).not.toHaveBeenCalled();
  expect(body).toEqual({ sent: [] });
});

it('says nothing about voting while the ballot is unlocked, or about nominations after it is', async () => {
  data.elections = [
    election('unlocked', { status: 'scheduled', start_date: hours(-3), end_date: hours(10) }),
    election('locked-noms', { nomination_start: hours(-1), nomination_end: hours(72), start_date: hours(100) })
  ];
  await cron();
  expect(sendPush).not.toHaveBeenCalled();
});

it('hands the new notices to notify(), which sends nothing until it is turned on', async () => {
  notify.mockClear();
  data.elections = [
    election('noms', { status: 'scheduled', start_date: hours(200), end_date: hours(300), nomination_start: hours(-1), nomination_end: hours(72) }),
    election('closing', { status: 'scheduled', start_date: hours(200), end_date: hours(300), nomination_start: hours(-100), nomination_end: hours(10) })
  ];
  await cron();
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ electionId: 'noms', kind: 'nominations_open' }));
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ electionId: 'closing', kind: 'nominations_closing' }));
});
