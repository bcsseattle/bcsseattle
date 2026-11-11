import {
  isMonthlyContribution,
  monthlyBillingAnchor
} from '@/utils/membership/billing';
import type { Price } from '@/types';

const mockCheckout = jest.fn();
const mockPrice = { value: null as Price | null };
const mockMember = { totalMembersInFamily: 3 };

jest.mock('@/utils/stripe/config', () => ({
  stripe: {
    checkout: {
      sessions: { create: (...args: unknown[]) => mockCheckout(...args) }
    }
  }
}));
jest.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user1', email: 'member@example.com' } }
      })
    }
  })
}));
jest.mock('@/utils/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: mockPrice.value })
      };
      return query;
    }
  },
  createOrRetrieveCustomer: async () => 'cus_member',
  retrieveMember: async () => mockMember,
  updateMember: async () => undefined
}));
jest.mock('@/utils/membership/handlers', () => ({ sendSMS: jest.fn() }));

import { checkoutWithStripe } from '@/utils/stripe/server';

const monthly: Price = {
  id: 'price_monthly',
  product_id: 'prod_contribution',
  active: true,
  description: null,
  type: 'recurring',
  interval: 'month',
  interval_count: 1,
  unit_amount: 500,
  currency: 'usd',
  trial_period_days: 0,
  metadata: { type: 'contribution' }
};

const isoAnchor = (now: string) => {
  const anchor = monthlyBillingAnchor(new Date(now));
  return anchor === undefined
    ? undefined
    : new Date(anchor * 1000).toISOString();
};

describe('monthly contribution billing day', () => {
  test.each([
    ['2026-11-10T20:00:00Z', '2026-11-18T12:00:00.000Z'],
    ['2026-11-19T20:00:00Z', '2026-12-18T12:00:00.000Z'],
    ['2026-12-31T23:00:00Z', '2027-01-18T12:00:00.000Z'],
    ['2028-02-29T23:00:00Z', '2028-03-18T12:00:00.000Z'],
    ['2026-02-28T23:00:00Z', '2026-03-18T12:00:00.000Z'],
    // Still the 17th in Seattle; do not accidentally advance a month.
    ['2026-11-18T07:30:00Z', '2026-11-18T12:00:00.000Z'],
    ['2026-11-18T12:00:01Z', '2026-12-18T12:00:00.000Z']
  ])('joining at %s aligns to %s', (now, expected) => {
    expect(isoAnchor(now)).toBe(expected);
  });

  test.each(['2026-11-18T11:59:30Z', '2026-11-18T12:00:00Z'])(
    'checkout at the billing boundary starts a full month immediately (%s)',
    (now) => {
      expect(isoAnchor(now)).toBeUndefined();
    }
  );

  test('the fixed billing time stays on the 18th in Seattle throughout the year', () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      day: 'numeric'
    });
    for (let month = 0; month < 12; month++) {
      const anchor = monthlyBillingAnchor(new Date(Date.UTC(2026, month, 1)))!;
      expect(formatter.format(new Date(anchor * 1000))).toBe('18');
    }
  });

  test('only monthly contribution prices qualify', () => {
    expect(isMonthlyContribution(monthly)).toBe(true);
    for (const changes of [
      { interval: 'year' },
      { interval_count: 6 },
      { type: 'one_time' },
      { metadata: { type: 'donation' } },
      { metadata: null }
    ]) {
      expect(isMonthlyContribution({ ...monthly, ...changes } as Price)).toBe(
        false
      );
    }
  });
});

describe('Stripe Checkout billing parameters', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T20:00:00Z'));
    mockPrice.value = { ...monthly };
    mockMember.totalMembersInFamily = 3;
    mockCheckout
      .mockReset()
      .mockResolvedValue({
        id: 'cs_new',
        url: 'https://checkout.stripe.com/new'
      });
  });
  afterEach(() => jest.useRealTimers());

  test('prorates the family subscription until the 18th using the trusted price', async () => {
    // The browser cannot supply a different interval or billing policy.
    const result = await checkoutWithStripe(
      { ...monthly, interval: 'year' },
      '/account',
      '/contribute'
    );
    expect(result.sessionId).toBe('cs_new');
    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_monthly', quantity: 3 }],
        subscription_data: {
          billing_cycle_anchor: Date.parse('2026-11-18T12:00:00Z') / 1000,
          proration_behavior: 'create_prorations'
        }
      })
    );
  });

  test('after the 18th the partial period ends on next month’s 18th', async () => {
    jest.setSystemTime(new Date('2026-11-25T20:00:00Z'));
    await checkoutWithStripe(monthly);
    expect(
      mockCheckout.mock.calls[0][0].subscription_data.billing_cycle_anchor
    ).toBe(Date.parse('2026-12-18T12:00:00Z') / 1000);
  });

  test('monthly proration does not also send an incompatible free trial', async () => {
    mockPrice.value = { ...monthly, trial_period_days: 7 };
    await checkoutWithStripe(monthly);
    expect(mockCheckout.mock.calls[0][0].subscription_data).not.toHaveProperty(
      'trial_end'
    );
  });

  test.each([
    { interval: 'year' as const },
    { interval_count: 6 },
    { metadata: { type: 'donation' } }
  ])(
    'other recurring plans keep their existing trial and billing policy (%j)',
    async (changes) => {
      mockPrice.value = { ...monthly, ...changes, trial_period_days: 7 };
      await checkoutWithStripe(monthly);
      expect(mockCheckout.mock.calls[0][0].subscription_data).toEqual({
        trial_end: Date.parse('2026-11-18T20:00:00Z') / 1000
      });
    }
  );

  test('one-time membership fees remain a single payment', async () => {
    mockPrice.value = { ...monthly, type: 'one_time', interval: null };
    await checkoutWithStripe(monthly, '/account', '/membership-fee', true);
    const params = mockCheckout.mock.calls[0][0];
    expect(params.mode).toBe('payment');
    expect(params).not.toHaveProperty('subscription_data');
    expect(params.line_items[0].quantity).toBe(1);
  });
});
