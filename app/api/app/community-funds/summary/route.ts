import { NextResponse } from 'next/server';
import { currentUser, fail, isActiveMember, unauthorized } from '@/utils/app-api';
import { getFundsSummary } from '@/utils/funds-cache';

/**
 * Funds › the totals only the server can read (they need the Stripe secret
 * key), as /community-funds shows them. In cents; `bankAsOf` is a Unix time,
 * and both bank fields are null until a bank account is linked (the app then
 * estimates from records, as the website does). The figures are kept for a
 * few minutes (utils/funds-cache.ts); who's asking is checked every time.
 */
export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  if (!(await isActiveMember(supabase, user.id))) return fail('Community funds are for active members.', 403);
  return NextResponse.json(await getFundsSummary());
}
