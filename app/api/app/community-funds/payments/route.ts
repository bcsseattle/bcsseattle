import { NextRequest, NextResponse } from 'next/server';
import { getStripePayments } from '@/utils/supabase/admin';
import { currentUser, fail, isActiveMember, unauthorized } from '@/utils/app-api';

/**
 * Funds › Recent activity: one month's successful Stripe payments
 * (?month=1-12&year=YYYY, default this month), as /community-funds lists them.
 * Only what the list shows; the app matches `customer` to a member from the
 * members table it already reads under RLS.
 */
export async function GET(request: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  if (!(await isActiveMember(supabase, user.id))) return fail('Community funds are for active members.', 403);

  const now = new Date();
  const params = request.nextUrl.searchParams;
  const month = Number(params.get('month')) || now.getMonth() + 1;
  const year = Number(params.get('year')) || now.getFullYear();
  if (month < 1 || month > 12) return fail('Choose a month from 1 to 12.');

  const { data, error } = await getStripePayments({
    dateRange: {
      gte: Math.floor(new Date(year, month - 1, 1).getTime() / 1000),
      lte: Math.floor(new Date(year, month, 0, 23, 59, 59, 999).getTime() / 1000)
    }
  });
  if (error || !data) return fail('Payments could not be loaded.', 502);

  const payments = data
    .filter((p) => p.status === 'succeeded' && p.customer !== null)
    .map((p) => ({
      id: p.id,
      customer: typeof p.customer === 'string' ? p.customer : p.customer!.id,
      amount: p.amount,
      created: p.created,
      // The same labels as the web list (components/recent-funds.tsx).
      type: p.description?.includes('Subscription')
        ? 'Contribution'
        : p.metadata?.isPrivate === 'true' || p.metadata?.type === 'donation'
          ? 'Donation'
          : 'Membership'
    }));
  return NextResponse.json({ payments });
}
