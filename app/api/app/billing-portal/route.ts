import { NextResponse } from 'next/server';
import { createStripePortal } from '@/utils/stripe/server';
import { appReturn, currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';

/** A Stripe customer portal link (change, pause or cancel a plan) that returns to the app. */
export async function POST() {
  const { user } = await currentUser();
  if (!user) return unauthorized();

  // createStripePortal answers with the portal URL, or an error path on this site.
  const result = await createStripePortal('/account', appReturn('portal'));
  if (!result.startsWith('https://')) return fail(redirectError(result), 502);
  return NextResponse.json({ url: result });
}
