import { fundsTotals, memberStats } from '@/utils/community';

describe('fundsTotals', () => {
  const records = {
    funds: [{ amount: 10_000 }, { amount: 5_000 }],
    expenses: [{ amount: 3_000 }],
    donations: [
      { donation_amount: 2_000, payment_method: 'zelle' },
      { donation_amount: 9_999, payment_method: 'card' },
      { donation_amount: 500, payment_method: 'us_bank_account' }
    ]
  };

  it('estimates the bank from records until a bank is linked', () => {
    const t = fundsTotals({ ...records, summary: null });
    // 15,000 received + 2,000 Zelle − 3,000 expenses; card and bank gifts are in Stripe.
    expect(t).toMatchObject({ bank: 14_000, stripe: 0, available: 14_000, bankEstimated: true });
  });

  it('uses the linked bank and Stripe balances when the server has them', () => {
    const t = fundsTotals({ ...records, summary: { bankBalance: 50_000, bankAsOf: 1, stripeBalance: 7_000, stripeFees: 100 } });
    expect(t).toMatchObject({ bank: 50_000, stripe: 7_000, available: 57_000, bankEstimated: false });
  });
});

describe('memberStats', () => {
  const member = (user_id: string, extra = {}) => ({ user_id, isApproved: true, status: 'active', totalMembersInFamily: 1, ...extra });
  const plan = (user_id: string, type = 'contribution', status = 'active') => ({
    user_id,
    status: status as 'active',
    quantity: 1,
    prices: { unit_amount: 500, interval: 'month' as const, interval_count: 1, products: { metadata: { type } } }
  });

  it('counts active members, those with a plan, and the people in their families', () => {
    const members = [
      member('a', { totalMembersInFamily: 4 }),
      member('b'),
      member('c', { totalMembersInFamily: null }),
      member('d', { isApproved: false, status: 'pending' }), // an application: not counted
      member('e', { status: 'inactive' }) // lapsed: not counted
    ];
    const subscriptions = [plan('a'), plan('b', 'donation'), plan('e'), plan('c', 'contribution', 'canceled')];
    // Only a's plan counts: b's is a recurring donation, c's is cancelled, e isn't active.
    expect(memberStats(members, subscriptions)).toEqual({ registered: 3, contributing: 1, people: 6 });
  });
});
