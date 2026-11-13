import type { Tables } from '@/types_db';
import { currentPlan, type PlanSubscription } from '@/utils/membership/plan';
import { membershipOf } from '@/utils/membership/state';

/**
 * BCS at a glance: the figures the app's Home, Funds and Members screens show,
 * worked out one way. Client-safe (no server imports). Amounts in cents.
 */

/** The totals only the server can read (GET /api/app/community-funds/summary). */
export type FundsSummary = { bankBalance: number | null; bankAsOf: number | null; stripeBalance: number; stripeFees: number };

/**
 * Available funds, as /community-funds: the linked bank's balance (or, until a
 * bank is linked, funds received plus money given outside Stripe, less
 * expenses) plus what's in Stripe.
 */
export function fundsTotals({
  funds,
  expenses,
  donations,
  summary
}: {
  /** Public funds that weren't cancelled or failed. */
  funds: { amount: number }[];
  /** Public expenses. */
  expenses: { amount: number }[];
  /** Public, completed donations. */
  donations: { donation_amount: number; payment_method: string | null }[];
  summary: FundsSummary | null;
}) {
  const received = funds.reduce((sum, f) => sum + f.amount, 0);
  // Card and bank gifts go through Stripe; Zelle, check, cash and others don't.
  const offline = donations
    .filter((d) => !['card', 'us_bank_account'].includes(d.payment_method ?? ''))
    .reduce((sum, d) => sum + d.donation_amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const bank = summary?.bankBalance ?? received + offline - spent;
  const stripe = summary?.stripeBalance ?? 0;
  return { received, offline, spent, bank, stripe, available: bank + stripe, bankEstimated: summary?.bankBalance == null };
}

/**
 * Members: registered (approved and active), contributing (those with a
 * current contribution plan, the rule that keeps them active), and the people
 * in their families.
 */
export function memberStats(
  members: Pick<Tables<'members'>, 'user_id' | 'isApproved' | 'status' | 'totalMembersInFamily'>[],
  subscriptions: PlanSubscription[]
) {
  const active = members.filter((m) => membershipOf(m) === 'active');
  return {
    registered: active.length,
    contributing: active.filter((m) => currentPlan(m.user_id, subscriptions)).length,
    people: active.reduce((sum, m) => sum + (m.totalMembersInFamily ?? 1), 0)
  };
}
