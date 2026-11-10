import { NextRequest, NextResponse } from 'next/server';
import { submitDonation } from '@/utils/donation/handlers';
import { checkoutWithStripeForDonation } from '@/utils/stripe/server';
import { appReturn, currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';
import { DonationFormSchema, type Price } from '@/types';

/**
 * A gift from the Give tab: the same steps as the /donate wizard. Zelle, check
 * and cash are recorded as pending pledges; card and bank go to Stripe Checkout,
 * which charges the amount saved here, not one sent later.
 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();

  const parsed = DonationFormSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const values = { ...parsed.data, userId: user.id };
  if (!(Number(values.amount) >= 1)) return fail('The smallest gift is USD 1.00.');

  const { donation, donor } = await submitDonation(values);
  if (!donation) return fail('Your gift could not be recorded. Please try again.', 502);

  if (values.paymentMethod !== 'card' && values.paymentMethod !== 'us_bank_account') {
    return NextResponse.json({ donationId: donation.id, status: 'pending' });
  }

  // The price the /donate page offers for this frequency.
  const { data: product } = await supabase
    .from('products')
    .select('prices(*)')
    .eq('active', true)
    .eq('name', 'BCS Donation')
    .eq('prices.active', true)
    .maybeSingle();
  const price = (product?.prices as Price[] | undefined)?.find(
    (p) => p.interval === values.frequency || p.type === 'one_time'
  );
  if (!price) return fail('Giving is not available right now.', 502);

  const { url, errorRedirect } = await checkoutWithStripeForDonation(
    price,
    appReturn('checkout', { kind: 'donation', id: donation.id }),
    appReturn('checkout', { kind: 'donation', id: donation.id, canceled: '1' }),
    donor,
    donation
  );
  if (!url) return fail(errorRedirect ? redirectError(errorRedirect) : 'Checkout could not be started.', 502);
  return NextResponse.json({ donationId: donation.id, url });
}
