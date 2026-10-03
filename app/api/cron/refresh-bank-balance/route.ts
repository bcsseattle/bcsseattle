import { stripe } from '@/utils/stripe/config';

// Weekly (vercel.json). Each refresh costs $0.10; the page reads the stored result for free.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const accountId = process.env.STRIPE_BANK_ACCOUNT_ID;
  if (!accountId) {
    return new Response('STRIPE_BANK_ACCOUNT_ID is not set', { status: 500 });
  }

  const account = await stripe.financialConnections.accounts.refresh(
    accountId,
    { features: ['balance'] }
  );
  return Response.json({ status: account.balance_refresh?.status });
}
