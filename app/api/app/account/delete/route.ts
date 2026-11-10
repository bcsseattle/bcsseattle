import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { bearerToken } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { stripe } from '@/utils/stripe/config';
import { currentUser, fail, lastSignIn, unauthorized } from '@/utils/app-api';

/** How recently the member must have proved who they are (password, code or link). */
const RECENT_SECONDS = 10 * 60;

/**
 * Deletes the signed-in member's account (App Store 5.1.1(v), Google Play
 * account deletion; plan §5.1). Billing stops first, so a failure there leaves
 * everything as it was. Then the member row is anonymised and the auth user
 * deleted: migration 20261109120000 deletes the person's own rows and keeps
 * votes, donations, invoices and audit logs with the link cleared.
 */
export async function POST() {
  const { user } = await currentUser();
  if (!user) return unauthorized();

  const token = bearerToken((await headers()).get('authorization'));
  if (!token || Date.now() / 1000 - lastSignIn(token) > RECENT_SECONDS) {
    return fail('For your security, confirm it’s you again, then delete your account.', 403);
  }

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();
  if (customer?.stripe_customer_id) {
    try {
      // Tagged first, so the webhook for the cancellation below knows why the customer row is gone.
      await stripe.customers.update(customer.stripe_customer_id, {
        metadata: { bcs_account_deleted: new Date().toISOString() }
      });
      const { data: subscriptions } = await stripe.subscriptions.list({
        customer: customer.stripe_customer_id,
        status: 'all',
        limit: 100
      });
      for (const subscription of subscriptions) {
        if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      }
    } catch (error) {
      // A customer that no longer exists in Stripe has no billing to stop.
      const missing = (error as { code?: string })?.code === 'resource_missing';
      if (!missing) {
        console.error('Account deletion: Stripe', error);
        return fail('We couldn’t stop your contribution plan, so nothing was deleted. Please try again.', 502);
      }
    }
  }

  const { error: memberError } = await supabaseAdmin
    .from('members')
    .update({
      fullName: null,
      address: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      isApproved: false,
      status: 'deleted'
    })
    .eq('user_id', user.id);
  const { error: deleteError } = memberError ? { error: memberError } : await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('Account deletion', deleteError);
    return fail('Your account couldn’t be deleted. Please try again, or contact us.', 500);
  }
  return NextResponse.json({ status: 'deleted' });
}
