import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Helpers for the /api/app/* routes the mobile app calls. Each route wraps a
 * server function the website already uses; none holds business logic.
 */

/** The signed-in user, from the app's Bearer token (see createClient). */
export async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export const unauthorized = () => fail('Sign in to continue.', 401);

/** The server functions report failures as a redirect path carrying ?error=…; the app wants the message. */
export const redirectError = (path: string) =>
  new URL(path, 'http://localhost').searchParams.get('error') ?? 'Something went wrong. Please try again.';

/** Where Stripe sends the browser back to: a /m/ page that offers to reopen the app. */
export const appReturn = (kind: 'checkout' | 'portal', params: Record<string, string> = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/m/return/${kind}${query && `?${query}`}`;
};

/** Approved, active members: the same rule as current_user_is_active_member() in RLS. */
export async function isActiveMember(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('members')
    .select('isApproved, status')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.isApproved && data.status === 'active';
}

/** The latest sign-in time in the token's `amr` claim, in seconds; 0 if there is none. */
export function lastSignIn(token: string) {
  try {
    const { amr } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return Math.max(0, ...(amr ?? []).map((entry: { timestamp?: number }) => entry.timestamp ?? 0));
  } catch {
    return 0;
  }
}
