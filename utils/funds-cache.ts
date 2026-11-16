import 'server-only';
import { unstable_cache } from 'next/cache';
import { getBankBalance, getStripeAvailableBalance, getStripePayments, getStripeRecentTransactions } from '@/utils/supabase/admin';
import type { FundsSummary } from '@/utils/community';

/**
 * Community funds figures from Stripe, kept for a few minutes in Next's data
 * cache (shared across requests and server instances). They're the same for
 * every member, and asking Stripe each time was slow: the fees alone page
 * through every balance transaction since June 2024 (seconds, and growing).
 * Callers still check who's asking before reading these.
 */

/** Stripe processing fees to date. They only grow with new payments, so an hour is fine. */
const stripeFees = unstable_cache(
  async () => (await getStripeRecentTransactions()).reduce((sum, t) => sum + t.fee, 0),
  ['community-funds', 'stripe-fees'],
  { revalidate: 3600 }
);

/** Stripe's balance and the linked bank's, five minutes at a time. */
const balances = unstable_cache(
  async () => {
    const [{ available, pending }, bank] = await Promise.all([getStripeAvailableBalance(), getBankBalance()]);
    return {
      stripeBalance: (available?.[0]?.amount ?? 0) + (pending?.[0]?.amount ?? 0),
      bankBalance: bank?.amount ?? null,
      bankAsOf: bank?.asOf ?? null
    };
  },
  ['community-funds', 'balances'],
  { revalidate: 300 }
);

/** The funds summary, in cents: what /community-funds and the app's Funds show. */
export async function getFundsSummary(): Promise<FundsSummary> {
  const [b, fees] = await Promise.all([balances(), stripeFees()]);
  return { ...b, stripeFees: fees };
}

export type MonthPayment = { id: string; customer: string; amount: number; created: number; type: 'Contribution' | 'Donation' | 'Membership' };

/**
 * One month's successful Stripe payments, labelled as the website's list does
 * (components/recent-funds.tsx). Kept five minutes for the current month and a
 * day for past months, which no longer change.
 */
export function getMonthPayments(month: number, year: number): Promise<MonthPayment[] | null> {
  const now = new Date();
  const current = year === now.getFullYear() && month === now.getMonth() + 1;
  return unstable_cache(
    async () => {
      const { data, error } = await getStripePayments({
        dateRange: {
          gte: Math.floor(new Date(year, month - 1, 1).getTime() / 1000),
          lte: Math.floor(new Date(year, month, 0, 23, 59, 59, 999).getTime() / 1000)
        }
      });
      if (error || !data) return null;
      return data
        .filter((p) => p.status === 'succeeded' && p.customer !== null)
        .map((p) => ({
          id: p.id,
          customer: typeof p.customer === 'string' ? p.customer : p.customer!.id,
          amount: p.amount,
          created: p.created,
          type: (p.description?.includes('Subscription')
            ? 'Contribution'
            : p.metadata?.isPrivate === 'true' || p.metadata?.type === 'donation'
              ? 'Donation'
              : 'Membership') as MonthPayment['type']
        }));
    },
    ['community-funds', 'payments', String(year), String(month)],
    { revalidate: current ? 300 : 86_400 }
  )();
}
