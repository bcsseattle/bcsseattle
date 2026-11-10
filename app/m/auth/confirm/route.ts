import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

/**
 * Email links of the form /m/auth/confirm?token_hash=…&type=… open the mobile
 * app (universal links / App Links claim /m/*). Without the app the link lands
 * here: verify it on the server and continue on the website, signed in, as
 * /auth/callback and /auth/reset_password do. Unused until the Supabase email
 * templates link here (docs/mobile-app-plan.md §3.3).
 */
const TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change'];

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (token_hash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(
          getStatusRedirect(`${origin}/signin/update_password`, 'You are now signed in.', 'Please enter a new password for your account.')
        );
      }
      if (type === 'email_change') {
        return NextResponse.redirect(getStatusRedirect(`${origin}/account`, 'Success!', 'Your email has been updated.'));
      }
      return NextResponse.redirect(getStatusRedirect(`${origin}/register`, 'Success!', 'You are now signed in.'));
    }
  }

  return NextResponse.redirect(
    getErrorRedirect(`${origin}/signin`, 'This link has expired or was already used.', 'Please sign in or ask for a new link.')
  );
}
