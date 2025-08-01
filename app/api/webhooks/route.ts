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
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          const metadata = checkoutSession.metadata;
          if (metadata?.type === 'donation') {
            await updateDonation({
              stripe_payment_id: checkoutSession.payment_intent as string,
              donation_id: metadata.donation_id,
              donation_status: 'completed'
            });
          }
          if (checkoutSession.mode === 'subscription') {
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
    return new Response(`Unsupported event type: ${event.type}`, {
      status: 400
    });
  }
  return new Response(JSON.stringify({ received: true }));
}
