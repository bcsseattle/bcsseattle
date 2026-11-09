import Stripe from 'stripe';
import { admin } from './db';
import { env } from './env';

export const stripe = new Stripe(env.stripeSecretKey);

export const DONATION_PRODUCT_ID = 'prod_e2e_bcs_donation';

/** Idempotent and race-safe across parallel workers: the product id is fixed. */
export async function ensureDonationProduct(): Promise<void> {
  try {
    await stripe.products.retrieve(DONATION_PRODUCT_ID);
  } catch {
    try {
      await stripe.products.create({ id: DONATION_PRODUCT_ID, name: 'BCS Donation', metadata: { e2e: 'true' } });
    } catch (err) {
      if ((err as Stripe.errors.StripeError).code !== 'resource_already_exists') throw err;
    }
  }
}

/** checkout.stripe.com/c/pay/cs_test_…#… → the Checkout Session from the Stripe test API. */
export async function sessionFromCheckoutUrl(url: string): Promise<Stripe.Checkout.Session> {
  const id = url.match(/(cs_test_[A-Za-z0-9]+)/)?.[1];
  if (!id) throw new Error(`No test Checkout Session id in ${url}`);
  return stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
}

/** POSTs an event to the app's webhook, signed exactly as Stripe would sign it. */
export async function postWebhook(
  event: { type: string; data: { object: Record<string, unknown> } },
  opts: { signature?: 'valid' | 'invalid' | 'none' } = {}
): Promise<{ status: number; body: string }> {
  const payload = JSON.stringify({
    id: `evt_e2e_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    ...event,
  });
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const signature = opts.signature ?? 'valid';
  if (signature !== 'none') {
    headers['stripe-signature'] = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: signature === 'valid' ? env.stripeWebhookSecret : 'whsec_wrong_secret',
    });
  }
  const res = await fetch(`${env.baseUrl}/api/webhooks`, { method: 'POST', headers, body: payload });
  return { status: res.status, body: await res.text() };
}

export function checkoutCompleted(metadata: Record<string, string>, amountTotalCents: number) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_e2e_${Date.now()}`,
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        payment_intent: `pi_e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        amount_total: amountTotalCents,
        metadata,
      },
    },
  };
}

/**
 * Gives a member a real (test-mode) paid contribution: a Stripe customer with one
 * succeeded $60 card payment, linked the way the app links it (customers row + members.stripe_customer_id).
 */
export async function givePaidContribution(
  cleanup: Array<() => Promise<unknown>>,
  user: { id: string; email: string },
  amountCents = 6000
): Promise<void> {
  const customer = await stripe.customers.create({ email: user.email, metadata: { e2e: 'true' } });
  cleanup.push(() => stripe.customers.del(customer.id));
  await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customer.id,
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  });
  const linked = await admin.from('customers').upsert({ id: user.id, stripe_customer_id: customer.id });
  if (linked.error) throw new Error(`link customer: ${linked.error.message}`);
  const member = await admin.from('members').update({ stripe_customer_id: user.id }).eq('user_id', user.id);
  if (member.error) throw new Error(`link member: ${member.error.message}`);
}
