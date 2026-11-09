import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import {
  upsertProductRecord,
  upsertPriceRecord,
  upsertFundRecord,
  manageSubscriptionStatusChange,
  deleteProductRecord,
  deletePriceRecord,
  updateDonation
} from '@/utils/supabase/admin';
import { updateFundraiserDonation } from '@/utils/supabase/fundraiser';
import { sendPaymentFailedEmail } from '@/utils/membership/handlers';
import { handleUpcomingInvoice } from '@/utils/stripe/server';

const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payout.created',
  'payout.updated',
  'payout.paid',
  'payout.failed',
  'charge.failed',
  'invoice.upcoming'
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret)
      return new Response('Webhook secret not found.', { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case 'price.deleted':
          await deletePriceRecord(event.data.object as Stripe.Price);
          break;
        case 'product.deleted':
          await deleteProductRecord(event.data.object as Stripe.Product);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === 'customer.subscription.created'
          );
          break;
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
        case 'checkout.session.async_payment_failed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          const metadata = checkoutSession.metadata;
          // Bank (ACH) payments complete the session before the money arrives
          // (payment_status 'unpaid'); they're settled by async_payment_succeeded
          // or failed by async_payment_failed (BUG-041).
          const failed = event.type === 'checkout.session.async_payment_failed';
          const paid = checkoutSession.payment_status !== 'unpaid';
          if (failed && metadata?.type === 'fundraiser_donation') {
            await updateFundraiserDonation({
              payment_intent_id: checkoutSession.payment_intent as string,
              fundraiser_id: metadata.fundraiser_id,
              donation_id: metadata.donation_id,
              payment_status: 'failed'
            });
          } else if (failed && metadata?.type === 'donation') {
            await updateDonation({
              stripe_payment_id: checkoutSession.payment_intent as string,
              donation_id: metadata.donation_id,
              donation_status: 'failed'
            });
          } else if (!paid) {
            // Still settling: leave the donation pending.
          } else if (metadata?.type === 'fundraiser_donation') {
            const amount = checkoutSession.amount_total ? checkoutSession.amount_total / 100 : 0;
            await updateFundraiserDonation({
              payment_intent_id: checkoutSession.payment_intent as string,
              fundraiser_id: metadata.fundraiser_id,
              donation_id: metadata.donation_id,
              payment_status: 'completed',
              amount
            });
          } else if (metadata?.type === 'donation') {
            await updateDonation({
              stripe_payment_id: checkoutSession.payment_intent as string,
              donation_id: metadata.donation_id,
              donation_status: 'completed'
            });
          }
          if (event.type === 'checkout.session.completed' && checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription;
            await manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
        case 'charge.failed':
          const charge = event.data.object as Stripe.Charge;
          await sendPaymentFailedEmail(charge);
          break;
        case 'payout.paid':
        case 'payout.failed':
        case 'payout.created':
        case 'payout.updated':
          const payout = event.data.object as Stripe.Payout;
          await upsertFundRecord(payout);
          break;
        case 'invoice.upcoming':
          const invoice = event.data.object as Stripe.Invoice;
          await handleUpcomingInvoice(invoice);
          break;
        case 'balance.available':
        case 'billing_portal.session.created':
        case 'charge.succeeded':
        case 'checkout.session.expired':
        case 'customer.created':
        case 'customer.deleted':
        case 'customer.discount.created':
        case 'customer.discount.deleted':
        case 'customer.discount.updated':
        case 'customer.source.created':
        case 'customer.source.deleted':
        case 'customer.source.updated':
        case 'customer.subscription.deleted':
        case 'customer.subscription.pending_update_applied':
        case 'customer.subscription.pending_update_expired':
        case 'customer.subscription.trial_will_end':
        case 'customer.subscription.updated':
        case 'customer.tax_id.created':
        case 'customer.tax_id.deleted':
        case 'customer.tax_id.updated':
        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.payment_succeeded':
        case 'invoice.paid':
        case 'payment_intent.created':
        case 'payment_intent.succeeded':
          return new Response('Event type ignored', {
            status: 204
          });
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.log(error);
      return new Response(
        'Webhook handler failed. View your Next.js function logs.',
        {
          status: 400
        }
      );
    }
  } else {
    // Acknowledge events we don't act on, or Stripe keeps retrying them and
    // eventually disables the endpoint (BUG-041).
    return new Response(`Event type ignored: ${event.type}`, { status: 200 });
  }
  return new Response(JSON.stringify({ received: true }));
}
