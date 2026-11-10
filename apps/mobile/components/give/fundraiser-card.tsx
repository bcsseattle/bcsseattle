'use client';

import { FundraiserCard } from '@/components/fundraisers/fundraiser-card';
import type { Fundraiser } from '@/types';

/** The fundraiser's screen in the app. */
export const fundraiserHref = (id: string) => `/give/fundraisers/view/?id=${id}`;

/**
 * The website's card with the app's routes, a 44pt Donate, and no Donate once
 * the fundraiser has closed. `donateHref` overrides where Donate goes.
 */
export function AppFundraiserCard({ fundraiser, donateHref }: { fundraiser: Fundraiser; donateHref?: string }) {
  return (
    <FundraiserCard
      fundraiser={fundraiser}
      href={fundraiserHref(fundraiser.id)}
      donateHref={donateHref ?? `/give/fundraisers/donate/?id=${fundraiser.id}`}
      hideDonateWhenClosed
      size="lg"
    />
  );
}
