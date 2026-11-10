import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitDonation } from '@/utils/fundraisers/handlers';
import { checkoutWithStripeForFundraiser } from '@/utils/stripe/server';
import { appReturn, currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';
import type { Donor, Price } from '@/types';

/**
 * A gift to one fundraiser, as its web donate page makes it. submitDonation
 * checks the fundraiser is open and the amount is within its limits; Checkout
 * charges the amount saved there.
 */
const Body = z.object({
  amount: z.number(),
  fullName: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  comment: z.string().max(1000).optional(),
  phone: z.string().optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentUser();
  if (!user) return unauthorized();

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('Enter an amount.');
  const { amount, fullName, isAnonymous, comment, phone } = parsed.data;
  const { id: fundraiserId } = await params;
  const name = isAnonymous ? 'Anonymous' : fullName || 'Anonymous';

  const result = await submitDonation(fundraiserId, amount, name, isAnonymous, comment, undefined, user.email, phone);
  if (!result.success || !result.donation) return fail(result.error || 'Your gift could not be recorded.');

  const { url, errorRedirect } = await checkoutWithStripeForFundraiser(
    {} as Price, // the amount comes from the saved donation
    appReturn('checkout', { kind: 'fundraiser', id: result.donation.id }),
    appReturn('checkout', { kind: 'fundraiser', id: result.donation.id, canceled: '1' }),
    { email: user.email ?? '', full_name: name } as Donor,
    result.donation
  );
  if (!url) return fail(errorRedirect ? redirectError(errorRedirect) : 'Checkout could not be started.', 502);
  return NextResponse.json({ donationId: result.donation.id, url });
}
