import type { Tables } from '@/types_db';
import { formatMoney } from '@/utils/format';

/**
 * A member's contribution plan, shared by the website's member directory and
 * the app. Client-safe (no server imports).
 */

type PlanPrice = Pick<Tables<'prices'>, 'unit_amount' | 'interval' | 'interval_count'> & {
  products?: Pick<Tables<'products'>, 'metadata'> | null;
};
export type PlanSubscription = Pick<Tables<'subscriptions'>, 'user_id' | 'status' | 'quantity'> & {
  prices: PlanPrice | null;
};

/** What to select from `subscriptions` for currentPlan. */
export const PLAN_SUBSCRIPTION_SELECT =
  'user_id, status, quantity, prices(unit_amount, interval, interval_count, products(metadata))' as const;

/**
 * The member's current plan: their active or trialing subscription that isn't
 * a recurring donation. This is the same rule that makes them an active member
 * (syncMemberStatus in utils/supabase/admin.ts). It's found through the
 * member's user, not members.subscription_id: only the Stripe webhook writes
 * that column, so it is missing for members activated by hand or before the
 * sync existed, and stale after a plan is replaced.
 */
export function currentPlan(userId: string | null | undefined, subscriptions: PlanSubscription[]) {
  if (!userId) return null;
  const subscription = subscriptions.find(
    (s) =>
      s.user_id === userId &&
      (s.status === 'active' || s.status === 'trialing') &&
      (s.prices?.products?.metadata as { type?: string } | null | undefined)?.type !== 'donation'
  );
  return subscription?.prices ? { price: subscription.prices, quantity: subscription.quantity } : null;
}

/**
 * "USD 15.00 / month", "USD 30.00 / 6 months", "USD 20.00" (one-time): the
 * price times the subscription's quantity (Checkout sets it to the family
 * size, 1 to 5), which is what the member pays.
 */
export function priceLabel(
  price: Pick<Tables<'prices'>, 'unit_amount' | 'interval' | 'interval_count'> | null | undefined,
  quantity?: number | null
) {
  const amount = formatMoney((price?.unit_amount ?? 0) * (quantity ?? 1));
  if (!price?.interval) return amount;
  const count = price.interval_count ?? 1;
  return `${amount} / ${count === 1 ? price.interval : `${count} ${price.interval}s`}`;
}
