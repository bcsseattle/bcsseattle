// One-time setup: link the org's bank account so /community-funds can show its balance.
//
//   1. node --env-file=.env.local scripts/link-bank-account.mjs
//      → open the printed URL and connect the bank account
//   2. node --env-file=.env.local scripts/link-bank-account.mjs <checkout_session_id>
//      → prints STRIPE_BANK_ACCOUNT_ID; add it to Vercel env vars
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sessionId = process.argv[2];

if (!sessionId) {
  const customer = await stripe.customers.create({
    name: 'BCSS Treasury',
    description: 'Holder of the linked bank account for /community-funds'
  });
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    currency: 'usd',
    customer: customer.id,
    payment_method_types: ['us_bank_account'],
    payment_method_options: {
      us_bank_account: {
        financial_connections: {
          permissions: ['payment_method', 'balances'],
          prefetch: ['balances']
        }
      }
    },
    success_url: 'https://example.com/?session_id={CHECKOUT_SESSION_ID}'
  });
  console.log(`Open and link the bank account:\n${session.url}`);
  console.log(`\nThen run:\nnode --env-file=.env.local scripts/link-bank-account.mjs ${session.id}`);
} else {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['setup_intent.payment_method']
  });
  const accountId =
    session.setup_intent?.payment_method?.us_bank_account
      ?.financial_connections_account;
  if (!accountId) {
    console.error('No linked account on this session. Did you finish the flow?');
    process.exit(1);
  }
  console.log(`STRIPE_BANK_ACCOUNT_ID=${accountId}`);
}
