/** Election notifications: off until switched on, one email per person, never twice. */
const claimed = new Set<string>();
const sendMail = jest.fn(async () => ({}));
const sendPush = jest.fn(async () => ({ devices: 0, removed: 0 }));

jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));
jest.mock('@/utils/push', () => ({ sendPush: (...args: unknown[]) => sendPush(...(args as [])) }));
jest.mock('@/utils/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'election_notifications') {
        return {
          insert: async (row: { election_id: string; kind: string; user_id: string | null }) => {
            const key = `${row.election_id}/${row.kind}/${row.user_id}`;
            if (claimed.has(key)) return { error: { code: '23505', message: 'duplicate' } };
            claimed.add(key);
            return { error: null };
          }
        };
      }
      // members: approved, active
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'not']) q[m] = () => q;
      q.then = (resolve: (v: unknown) => void) => resolve({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null });
      return q;
    },
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: [{ id: 'u1', email: 'one@example.com' }, { id: 'u2', email: 'two@example.com' }, { id: 'u3', email: 'three@example.com' }] }
        })
      }
    }
  }
}));

import { notify } from '@/utils/elections/notify';

const notice = { electionId: 'e1', kind: 'results_published' as const, email: { subject: 'Results', text: 'Out now' }, push: { title: 'Results', body: 'Out now' } };

beforeEach(() => {
  claimed.clear();
  sendMail.mockClear();
  sendPush.mockClear();
  delete process.env.ELECTION_NOTIFICATIONS;
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

it('sends nothing and claims nothing until ELECTION_NOTIFICATIONS=send', async () => {
  expect(await notify(notice)).toBe(0);
  expect(sendMail).not.toHaveBeenCalled();
  expect(sendPush).not.toHaveBeenCalled();
  expect(claimed.size).toBe(0);
});

it('emails each active member separately and pushes to them, once', async () => {
  process.env.ELECTION_NOTIFICATIONS = 'send';
  expect(await notify(notice)).toBe(2);
  expect(sendMail.mock.calls.map(([m]: any) => m.to)).toEqual(['one@example.com', 'two@example.com']);
  expect(sendPush).toHaveBeenCalledWith(['u1', 'u2'], notice.push);

  expect(await notify(notice)).toBe(0);
  expect(sendMail).toHaveBeenCalledTimes(2);
});

it('sends a personal notice once per person', async () => {
  process.env.ELECTION_NOTIFICATIONS = 'send';
  const personal = { electionId: 'e1', kind: 'nominated' as const, to: ['u3'], email: { subject: 'Nominated', text: 'Hi' } };
  expect(await notify(personal)).toBe(1);
  expect(sendMail.mock.calls.map(([m]: any) => m.to)).toEqual(['three@example.com']);
  expect(await notify(personal)).toBe(0);
  expect(await notify({ ...personal, to: ['u1', 'u3'] })).toBe(1);
});
