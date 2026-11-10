/**
 * POST /api/app/account/delete: needs a recent sign-in, stops billing before
 * touching data, anonymises the member row, then deletes the auth user.
 */
const calls: string[] = [];
let requestHeaders = new Headers();
const state = {
  user: { id: 'u1', email: 'member@example.com' } as { id: string; email: string } | null,
  customer: { stripe_customer_id: 'cus_1' } as { stripe_customer_id: string } | null,
  subscriptions: [] as { id: string; status: string }[],
  stripeFails: false as boolean | 'missing',
  memberError: null as { message: string } | null
};

jest.mock('next/headers', () => ({ headers: async () => requestHeaders }));
jest.mock('@/utils/supabase/server', () => ({
  ...jest.requireActual('@/utils/supabase/server'),
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } })
}));
jest.mock('@/utils/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'customers' ? state.customer : null }) }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async (column: string, value: string) => {
          calls.push(`update ${table} ${column}=${value} status=${values.status} fullName=${values.fullName}`);
          return { error: state.memberError };
        }
      })
    }),
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          calls.push(`deleteUser ${id}`);
          return { error: null };
        }
      }
    }
  }
}));
jest.mock('@/utils/stripe/config', () => ({
  stripe: {
    customers: {
      update: async (id: string, body: { metadata: Record<string, string> }) => {
        if (state.stripeFails === 'missing') throw Object.assign(new Error('No such customer'), { code: 'resource_missing' });
        if (state.stripeFails) throw new Error('stripe down');
        calls.push(`tag ${id} ${Object.keys(body.metadata)}`);
      }
    },
    subscriptions: {
      list: async () => ({ data: state.subscriptions }),
      cancel: async (id: string) => {
        calls.push(`cancel ${id}`);
      }
    }
  }
}));

import { POST } from '@/app/api/app/account/delete/route';
import { lastSignIn } from '@/utils/app-api';

const token = (secondsAgo: number) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
    JSON.stringify({ sub: 'u1', amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) - secondsAgo }] })
  ).toString('base64url')}.c2ln`;
const signedIn = (secondsAgo: number) => {
  requestHeaders = new Headers({ authorization: `Bearer ${token(secondsAgo)}` });
};

beforeEach(() => {
  calls.length = 0;
  state.user = { id: 'u1', email: 'member@example.com' };
  state.customer = { stripe_customer_id: 'cus_1' };
  state.subscriptions = [];
  state.stripeFails = false;
  state.memberError = null;
  signedIn(30);
});

it('reads the latest sign-in from the amr claim', () => {
  const now = Math.floor(Date.now() / 1000);
  expect(lastSignIn(token(0))).toBeGreaterThanOrEqual(now - 1);
  expect(lastSignIn('not-a-jwt')).toBe(0);
});

it('needs a signed-in user', async () => {
  state.user = null;
  expect((await POST()).status).toBe(401);
  expect(calls).toEqual([]);
});

it('needs a sign-in from the last 10 minutes, and changes nothing otherwise', async () => {
  signedIn(11 * 60);
  const response = await POST();
  expect(response.status).toBe(403);
  expect((await response.json()).error).toMatch(/confirm it’s you again/);
  expect(calls).toEqual([]);
});

it('stops billing, anonymises the member, then deletes the user', async () => {
  state.subscriptions = [
    { id: 'sub_active', status: 'active' },
    { id: 'sub_old', status: 'canceled' },
    { id: 'sub_paused', status: 'paused' }
  ];
  const response = await POST();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'deleted' });
  expect(calls).toEqual([
    'tag cus_1 bcs_account_deleted',
    'cancel sub_active',
    'cancel sub_paused',
    'update members user_id=u1 status=deleted fullName=null',
    'deleteUser u1'
  ]);
});

it('works for someone who never had a plan', async () => {
  state.customer = null;
  expect((await POST()).status).toBe(200);
  expect(calls).toEqual(['update members user_id=u1 status=deleted fullName=null', 'deleteUser u1']);
});

it('deletes nothing when Stripe fails', async () => {
  state.stripeFails = true;
  const response = await POST();
  expect(response.status).toBe(502);
  expect(calls).toEqual([]);
});

it('goes ahead when the Stripe customer no longer exists (nothing to bill)', async () => {
  state.stripeFails = 'missing';
  expect((await POST()).status).toBe(200);
  expect(calls).toEqual(['update members user_id=u1 status=deleted fullName=null', 'deleteUser u1']);
});

it('does not delete the user when the member row could not be anonymised', async () => {
  state.memberError = { message: 'boom' };
  expect((await POST()).status).toBe(500);
  expect(calls).not.toContain('deleteUser u1');
});
