import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { appReturn, currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';
import type { Price } from '@/types';

/**
 * Start a membership fee or member contribution in Stripe Checkout, as
 * /membership-fee and /contribute do. checkoutWithStripe reads the amount from
 * our copy of the price; the app only names which one.
 */
const Body = z.object({
  priceId: z.string().min(1),
  plan: z.enum(['membership', 'contribution']),
  generous: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  const { user } = await currentUser();
  if (!user) return unauthorized();

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Choose a plan.');
  const { priceId, plan, generous } = body.data;

  const { url, errorRedirect } = await checkoutWithStripe(
    { id: priceId } as Price,
    appReturn('checkout', { kind: plan }),
    appReturn('checkout', { kind: plan, canceled: '1' }),
    plan === 'membership',
    plan === 'contribution' && !!generous
  );
  if (!url) return fail(errorRedirect ? redirectError(errorRedirect) : 'Checkout could not be started.', 502);
  return NextResponse.json({ url });
}
