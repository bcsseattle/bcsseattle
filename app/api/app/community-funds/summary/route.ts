import { NextResponse } from 'next/server';
import { getBankBalance, getStripeAvailableBalance, getStripeRecentTransactions } from '@/utils/supabase/admin';
import { currentUser, fail, isActiveMember, unauthorized } from '@/utils/app-api';

/**
 * Funds › the totals only the server can read (they need the Stripe secret
 * key), computed exactly as /community-funds does. In cents; `bankAsOf` is a
 * Unix time, and both bank fields are null until a bank account is linked
 * (the app then estimates from records, as the website does).
 */
export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  if (!(await isActiveMember(supabase, user.id))) return fail('Community funds are for active members.', 403);

  const [{ available, pending }, transactions, bank] = await Promise.all([
    getStripeAvailableBalance(),
    getStripeRecentTransactions(),
    getBankBalance()
  ]);
  return NextResponse.json({
    bankBalance: bank?.amount ?? null,
    bankAsOf: bank?.asOf ?? null,
    stripeBalance: (available?.[0]?.amount ?? 0) + (pending?.[0]?.amount ?? 0),
    stripeFees: transactions?.reduce((total: number, t: { fee: number }) => total + t.fee, 0) ?? 0
  });
}
