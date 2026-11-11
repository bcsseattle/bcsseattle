/** utils/membership/plan.ts: the plan the member directory shows, on the website and in the app. */
import { currentPlan, priceLabel, type PlanSubscription } from '@/utils/membership/plan';

const monthly = { unit_amount: 500, interval: 'month' as const, interval_count: 1, products: { metadata: { type: 'contribution' } } };
const sub = (overrides: Partial<PlanSubscription>): PlanSubscription => ({
  user_id: 'u1',
  status: 'active',
  quantity: 1,
  prices: monthly,
  ...overrides
});

describe('currentPlan', () => {
  it("finds an active member's plan through their user, with no subscription pointer on the member row", () => {
    // The reported bug: members.subscription_id empty or stale, but the member pays.
    expect(currentPlan('u1', [sub({})])).toEqual({ price: monthly, quantity: 1 });
  });

  it('counts a trialing plan, as membership does', () => {
    expect(currentPlan('u1', [sub({ status: 'trialing' })])).not.toBeNull();
  });

  it('skips cancelled and unpaid plans, recurring donations and other people', () => {
    const donation = { ...monthly, products: { metadata: { type: 'donation' } } };
    expect(
      currentPlan('u1', [
        sub({ status: 'canceled' }),
        sub({ status: 'unpaid' }),
        sub({ prices: donation }),
        sub({ user_id: 'u2' })
      ])
    ).toBeNull();
  });

  it('picks the live plan when an old one is still on file', () => {
    const yearly = { ...monthly, unit_amount: 6000, interval: 'year' as const };
    expect(currentPlan('u1', [sub({ status: 'canceled' }), sub({ prices: yearly })])?.price).toBe(yearly);
  });

  it('has no plan without a user', () => {
    expect(currentPlan(null, [sub({})])).toBeNull();
  });
});

describe('priceLabel', () => {
  it('multiplies by the quantity Stripe charges (the family size, 1 to 5)', () => {
    expect(priceLabel(monthly, 3)).toBe('USD\u00a015.00 / month');
  });

  it('names multi-month intervals', () => {
    expect(priceLabel({ unit_amount: 3000, interval: 'month', interval_count: 6 }, 1)).toBe('USD\u00a030.00 / 6 months');
  });

  it('shows a one-time price without an interval', () => {
    expect(priceLabel({ unit_amount: 2000, interval: null, interval_count: null })).toBe('USD\u00a020.00');
  });
});
