import type { Price } from '@/types';

export const MONTHLY_BILLING_NOTE =
  'Billed on the 18th of each month. Your first payment is prorated for the time until the next billing date.';

export function isMonthlyContribution(
  price: Pick<Price, 'type' | 'interval' | 'interval_count' | 'metadata'>
) {
  const metadata = price.metadata;
  return (
    price.type === 'recurring' &&
    price.interval === 'month' &&
    (price.interval_count ?? 1) === 1 &&
    metadata !== null &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    metadata.type === 'contribution'
  );
}

/**
 * Stripe keeps anchors in UTC. Noon UTC is always the 18th in Seattle,
 * including after daylight saving changes (4am PST / 5am PDT).
 * Stripe calculates and collects the initial proration in Checkout.
 */
export function monthlyBillingAnchor(now = new Date()): number | undefined {
  const current = Math.floor(now.getTime() / 1000);
  const anchor = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 18, 12) / 1000
  );

  // At the billing boundary, start a full month now. Avoid sending an anchor
  // that could become past while the Checkout request is in flight.
  if (anchor >= current && anchor - current <= 60) return undefined;

  return anchor > current
    ? anchor
    : Math.floor(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 18, 12) / 1000
      );
}
