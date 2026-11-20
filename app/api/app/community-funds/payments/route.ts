import { NextRequest, NextResponse } from 'next/server';
import { currentUser, fail, isActiveMember, unauthorized } from '@/utils/app-api';
import { getMonthPayments } from '@/utils/funds-cache';

/**
 * Funds › Recent activity: one month's successful Stripe payments
 * (?month=1-12&year=YYYY, default this month), as /community-funds lists them.
 * Only what the list shows; the app matches `customer` to a member from the
 * members table it already reads under RLS. Kept a few minutes for this month
 * and a day for past ones (utils/funds-cache.ts); who's asking is checked
 * every time.
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

  const payments = await getMonthPayments(month, year);
  if (!payments) return fail('Payments could not be loaded.', 502);
  return NextResponse.json({ payments });
}
