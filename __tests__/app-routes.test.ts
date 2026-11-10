/**
 * The /api/app/* routes the mobile app calls, plus /m/* and /.well-known/*.
 * Each wraps a server function the website already uses (mocked here): these
 * tests check sign-in, input checks, that the user always comes from the token,
 * and that Stripe sends the browser back through /m/return/*.
 */
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

const mockDb: { user: { id: string; email: string } | null; rows: Record<string, unknown>; verifyOtp: jest.Mock } = {
  user: null,
  rows: {},
  verifyOtp: jest.fn()
};
jest.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockDb.user } }),
      verifyOtp: (...args: unknown[]) => mockDb.verifyOtp(...args)
    },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: async () => ({ data: mockDb.rows[table] ?? null })
      };
      return query;
    }
  })
}));
jest.mock('@/utils/stripe/server', () => ({
  checkoutWithStripe: jest.fn(),
  checkoutWithStripeForDonation: jest.fn(),
  checkoutWithStripeForFundraiser: jest.fn(),
  createStripePortal: jest.fn()
}));
jest.mock('@/utils/donation/handlers', () => ({ submitDonation: jest.fn() }));
jest.mock('@/utils/fundraisers/handlers', () => ({ submitDonation: jest.fn() }));
jest.mock('@/utils/membership/handlers', () => ({ registerMember: jest.fn() }));
jest.mock('@/utils/elections/handlers', () => ({ nominateCandidate: jest.fn() }));
jest.mock('@/utils/supabase/admin', () => ({ getStripePayments: jest.fn(), getTotalCustomerSpent: jest.fn() }));
jest.mock('@/app/(portal)/account/[memberId]/contributions/pdf/route', () => ({
  GET: jest.fn(async () => new Response('%PDF', { headers: { 'content-type': 'application/pdf' } }))
}));

import * as stripe from '@/utils/stripe/server';
import { submitDonation } from '@/utils/donation/handlers';
import { submitDonation as submitFundraiserDonation } from '@/utils/fundraisers/handlers';
import { registerMember } from '@/utils/membership/handlers';
import { nominateCandidate } from '@/utils/elections/handlers';
import { getStripePayments, getTotalCustomerSpent } from '@/utils/supabase/admin';
import { GET as contributionsPdf } from '@/app/(portal)/account/[memberId]/contributions/pdf/route';
import { POST as checkout } from '@/app/api/app/checkout/route';
import { POST as billingPortal } from '@/app/api/app/billing-portal/route';
import { POST as donate } from '@/app/api/app/donations/route';
import { POST as giveToFundraiser } from '@/app/api/app/fundraisers/[id]/donations/route';
import { POST as register } from '@/app/api/app/register/route';
import { POST as nominate } from '@/app/api/app/elections/[id]/nominate/route';
import { GET as fundsPayments } from '@/app/api/app/community-funds/payments/route';
import { GET as memberTotal } from '@/app/api/app/members/[id]/total/route';
import { GET as contributionReceipt } from '@/app/api/app/receipts/contributions/route';
import { GET as confirmEmail } from '@/app/m/auth/confirm/route';
import { GET as aasa } from '@/app/.well-known/apple-app-site-association/route';
import { GET as assetlinks } from '@/app/.well-known/assetlinks.json/route';

const USER = { id: 'u1', email: 'member@example.com' };
const ACTIVE = { isApproved: true, status: 'active' };
const json = (path: string, body: unknown) =>
  new NextRequest(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body) });
const id = (value: string) => ({ params: Promise.resolve({ id: value }) });
const mocked = (fn: unknown) => fn as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.user = USER;
  mockDb.rows = {};
});

describe('every route needs a signed-in user', () => {
  it.each([
    ['checkout', () => checkout(json('/api/app/checkout', {}))],
    ['billing portal', () => billingPortal()],
    ['donations', () => donate(json('/api/app/donations', {}))],
    ['fundraiser gift', () => giveToFundraiser(json('/x', {}), id('f1'))],
    ['register', () => register(json('/api/app/register', {}))],
    ['nominate', () => nominate(new NextRequest('http://localhost/x', { method: 'POST' }), id('e1'))],
    ['funds payments', () => fundsPayments(new NextRequest('http://localhost/x'))],
    ['member total', () => memberTotal(new Request('http://localhost/x'), id('m1'))],
    ['contribution receipt', () => contributionReceipt(new NextRequest('http://localhost/x'))]
  ])('%s answers 401 without one', async (_name, call) => {
    mockDb.user = null;
    expect((await call()).status).toBe(401);
  });
});

describe('POST /api/app/checkout', () => {
  it('rejects an unknown plan', async () => {
    expect((await checkout(json('/x', { priceId: 'p1', plan: 'gold' }))).status).toBe(400);
  });

  it('starts Checkout for the named price and returns through /m/return', async () => {
    mocked(stripe.checkoutWithStripe).mockResolvedValue({ sessionId: 's1', url: 'https://checkout.stripe.com/s1' });
    const res = await checkout(json('/x', { priceId: 'p1', plan: 'contribution', generous: true }));
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/s1' });
    expect(stripe.checkoutWithStripe).toHaveBeenCalledWith(
      { id: 'p1' },
      '/m/return/checkout?kind=contribution',
      '/m/return/checkout?kind=contribution&canceled=1',
      false,
      true
    );
  });

  it('passes on the error message', async () => {
    mocked(stripe.checkoutWithStripe).mockResolvedValue({
      errorRedirect: '/x?error=This%20price%20is%20not%20available.&error_description=Try%20later'
    });
    const res = await checkout(json('/x', { priceId: 'old', plan: 'membership' }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'This price is not available.' });
  });
});

describe('POST /api/app/billing-portal', () => {
  it('returns the portal URL, returning to /m/return/portal', async () => {
    mocked(stripe.createStripePortal).mockResolvedValue('https://billing.stripe.com/p/1');
    expect(await (await billingPortal()).json()).toEqual({ url: 'https://billing.stripe.com/p/1' });
    expect(stripe.createStripePortal).toHaveBeenCalledWith('/account', '/m/return/portal');
  });

  it('turns an error path into a message', async () => {
    mocked(stripe.createStripePortal).mockResolvedValue('/account?error=Could%20not%20get%20customer.');
    const res = await billingPortal();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Could not get customer.' });
  });
});

describe('POST /api/app/donations', () => {
  const gift = (overrides = {}) => ({
    frequency: 'one_time',
    amount: '100',
    purpose: 'general-purpose',
    donorType: 'individual',
    donorName: 'Sameer',
    email: 'member@example.com',
    paymentMethod: 'card',
    ...overrides
  });

  it('checks the form', async () => {
    expect((await donate(json('/x', gift({ email: 'nope' })))).status).toBe(400);
    expect((await donate(json('/x', gift({ amount: '0' })))).status).toBe(400);
    expect(submitDonation).not.toHaveBeenCalled();
  });

  it('records Zelle, check and cash as pending pledges without Stripe', async () => {
    mocked(submitDonation).mockResolvedValue({ donation: { id: 'd1' }, donor: {} });
    const res = await donate(json('/x', gift({ paymentMethod: 'zelle' })));
    expect(await res.json()).toEqual({ donationId: 'd1', status: 'pending' });
    expect(stripe.checkoutWithStripeForDonation).not.toHaveBeenCalled();
  });

  it('records the gift for the signed-in user, then opens Checkout', async () => {
    mocked(submitDonation).mockResolvedValue({ donation: { id: 'd1' }, donor: { id: 'donor1' } });
    mockDb.rows.products = { prices: [{ id: 'monthly', interval: 'month', type: 'recurring' }, { id: 'once', interval: null, type: 'one_time' }] };
    mocked(stripe.checkoutWithStripeForDonation).mockResolvedValue({ url: 'https://checkout.stripe.com/d1' });

    const res = await donate(json('/x', gift({ userId: 'someone-else' })));
    expect(await res.json()).toEqual({ donationId: 'd1', url: 'https://checkout.stripe.com/d1' });
    expect(mocked(submitDonation).mock.calls[0][0].userId).toBe('u1');
    expect(stripe.checkoutWithStripeForDonation).toHaveBeenCalledWith(
      { id: 'once', interval: null, type: 'one_time' },
      '/m/return/checkout?kind=donation&id=d1',
      '/m/return/checkout?kind=donation&id=d1&canceled=1',
      { id: 'donor1' },
      { id: 'd1' }
    );
  });
});

describe('POST /api/app/fundraisers/[id]/donations', () => {
  it("gives under the member's email and passes on the handler's checks", async () => {
    mocked(submitFundraiserDonation).mockResolvedValue({ success: false, error: 'This fundraiser has ended' });
    const res = await giveToFundraiser(json('/x', { amount: 25, isAnonymous: true }), id('f1'));
    expect(await res.json()).toEqual({ error: 'This fundraiser has ended' });
    expect(submitFundraiserDonation).toHaveBeenCalledWith('f1', 25, 'Anonymous', true, undefined, undefined, 'member@example.com', undefined);
  });

  it('opens Checkout for the saved donation', async () => {
    mocked(submitFundraiserDonation).mockResolvedValue({ success: true, donation: { id: 'fd1' } });
    mocked(stripe.checkoutWithStripeForFundraiser).mockResolvedValue({ url: 'https://checkout.stripe.com/fd1' });
    const res = await giveToFundraiser(json('/x', { amount: 25, fullName: 'Sameer' }), id('f1'));
    expect(await res.json()).toEqual({ donationId: 'fd1', url: 'https://checkout.stripe.com/fd1' });
    expect(mocked(stripe.checkoutWithStripeForFundraiser).mock.calls[0][1]).toBe('/m/return/checkout?kind=fundraiser&id=fd1');
  });
});

describe('POST /api/app/register', () => {
  it('treats the success redirect as pending approval', async () => {
    mocked(registerMember).mockImplementation(async () => redirect('/membership-fee'));
    expect(await (await register(json('/x', { fullName: 'A' }))).json()).toEqual({ status: 'pending' });
  });

  it('passes on a validation message', async () => {
    mocked(registerMember).mockResolvedValue('/register?error=Please%20check%20the%20form.');
    const res = await register(json('/x', {}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Please check the form.' });
  });
});

describe('POST /api/app/elections/[id]/nominate', () => {
  const form = (fields: Record<string, string | Blob>) => {
    const data = new FormData();
    Object.entries(fields).forEach(([k, v]) => data.append(k, v));
    return new NextRequest('http://localhost/x', { method: 'POST', body: data });
  };

  it('checks the form before nominating', async () => {
    expect((await nominate(form({ fullName: 'A' }), id('e1'))).status).toBe(400);
    expect(nominateCandidate).not.toHaveBeenCalled();
  });

  it('nominates with the photo', async () => {
    mocked(nominateCandidate).mockResolvedValue('/elections/e1?status=Success!');
    const photo = new Blob(['img'], { type: 'image/jpeg' });
    const res = await nominate(form({ fullName: 'Amina Baloch', position: 'President', photoFile: photo }), id('e1'));
    expect(await res.json()).toEqual({ status: 'nominated' });
    const [values, electionId] = mocked(nominateCandidate).mock.calls[0];
    expect(electionId).toBe('e1');
    expect(values).toMatchObject({ fullName: 'Amina Baloch', position: 'President' });
    expect(values.photoFile).toBeInstanceOf(Blob);
  });

  it('passes on the reason it was refused', async () => {
    mocked(nominateCandidate).mockResolvedValue('/elections/e1/nominate?error=Nominations%20are%20not%20open%20for%20this%20election.');
    const res = await nominate(form({ fullName: 'Amina Baloch', position: 'President' }), id('e1'));
    expect(await res.json()).toEqual({ error: 'Nominations are not open for this election.' });
  });
});

describe('GET /api/app/community-funds/payments', () => {
  it('is for active members only', async () => {
    mockDb.rows.members = { isApproved: true, status: 'pending' };
    expect((await fundsPayments(new NextRequest('http://localhost/x'))).status).toBe(403);
  });

  it("returns the month's successful member payments, labelled as on the web", async () => {
    mockDb.rows.members = ACTIVE;
    mocked(getStripePayments).mockResolvedValue({
      data: [
        { id: 'pi1', status: 'succeeded', customer: 'cus_1', amount: 2500, created: 1, description: 'Subscription update', metadata: {} },
        { id: 'pi2', status: 'succeeded', customer: 'cus_2', amount: 10000, created: 2, description: null, metadata: { type: 'donation' } },
        { id: 'pi3', status: 'canceled', customer: 'cus_3', amount: 500, created: 3, description: null, metadata: {} },
        { id: 'pi4', status: 'succeeded', customer: null, amount: 500, created: 4, description: null, metadata: {} }
      ],
      error: null
    });
    const res = await fundsPayments(new NextRequest('http://localhost/x?month=11&year=2026'));
    expect((await res.json()).payments).toEqual([
      { id: 'pi1', customer: 'cus_1', amount: 2500, created: 1, type: 'Contribution' },
      { id: 'pi2', customer: 'cus_2', amount: 10000, created: 2, type: 'Donation' }
    ]);
    const { dateRange } = mocked(getStripePayments).mock.calls[0][0];
    expect(new Date(dateRange.gte * 1000)).toEqual(new Date(2026, 10, 1));
    expect(new Date(dateRange.lte * 1000).getDate()).toBe(30);
  });

  it('rejects a month out of range', async () => {
    mockDb.rows.members = ACTIVE;
    expect((await fundsPayments(new NextRequest('http://localhost/x?month=13'))).status).toBe(400);
  });
});

describe('GET /api/app/members/[id]/total', () => {
  it("reads the member's Stripe total", async () => {
    mockDb.rows.members = { ...ACTIVE, customers: { stripe_customer_id: 'cus_1' } };
    mocked(getTotalCustomerSpent).mockResolvedValue(30000);
    expect(await (await memberTotal(new Request('http://localhost/x'), id('m1'))).json()).toEqual({ total: 30000 });
    expect(getTotalCustomerSpent).toHaveBeenCalledWith({ customerId: 'cus_1' });
  });

  it('never asks Stripe without a customer (that would total everyone)', async () => {
    mockDb.rows.members = { ...ACTIVE, customers: null };
    expect(await (await memberTotal(new Request('http://localhost/x'), id('m1'))).json()).toEqual({ total: 0 });
    expect(getTotalCustomerSpent).not.toHaveBeenCalled();
  });
});

describe('GET /api/app/receipts/contributions', () => {
  it("renders the signed-in member's own receipt", async () => {
    mockDb.rows.members = { id: 'own-member' };
    const req = new NextRequest('http://localhost/api/app/receipts/contributions?taxYear=2025');
    const res = await contributionReceipt(req);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(await mocked(contributionsPdf).mock.calls[0][1].params).toEqual({ memberId: 'own-member' });
  });

  it('404s for an account with no membership', async () => {
    expect((await contributionReceipt(new NextRequest('http://localhost/x'))).status).toBe(404);
  });
});

describe('GET /m/auth/confirm (the web fallback for app email links)', () => {
  const open = (query: string) => confirmEmail(new NextRequest(`http://localhost/m/auth/confirm?${query}`));

  it.each([
    ['recovery', '/signin/update_password'],
    ['email_change', '/account'],
    ['magiclink', '/register']
  ])('verifies a %s link and continues to %s', async (type, path) => {
    mockDb.verifyOtp.mockResolvedValue({ error: null });
    const res = await open(`token_hash=abc&type=${type}`);
    expect(mockDb.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type });
    expect(new URL(res.headers.get('location')!).pathname).toBe(path);
  });

  it('sends a bad or used link to sign-in', async () => {
    mockDb.verifyOtp.mockResolvedValue({ error: new Error('expired') });
    expect(new URL((await open('token_hash=abc&type=email')).headers.get('location')!).pathname).toBe('/signin');
    expect(new URL((await open('token_hash=abc&type=bogus')).headers.get('location')!).pathname).toBe('/signin');
  });
});

describe('/.well-known deep-link files', () => {
  afterEach(() => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.ANDROID_CERT_SHA256;
  });

  it('are 404 until the store accounts exist', () => {
    expect(aasa().status).toBe(404);
    expect(assetlinks().status).toBe(404);
  });

  it('claim only /m/* for org.bcsseattle.app', async () => {
    process.env.APPLE_TEAM_ID = 'TEAM123';
    process.env.ANDROID_CERT_SHA256 = 'AA:BB, CC:DD';
    expect(await aasa().json()).toEqual({
      applinks: { details: [{ appIDs: ['TEAM123.org.bcsseattle.app'], components: [{ '/': '/m/*' }] }] }
    });
    const [statement] = await assetlinks().json();
    expect(statement.target).toEqual({
      namespace: 'android_app',
      package_name: 'org.bcsseattle.app',
      sha256_cert_fingerprints: ['AA:BB', 'CC:DD']
    });
    expect(assetlinks().headers.get('content-type')).toContain('application/json');
  });
});
