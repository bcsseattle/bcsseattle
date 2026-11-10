'use client';

import { AppHeader } from '~/components/app-header';
import { EmailCodeFlow } from '~/components/auth-form';
import { useSignedInRedirect } from '~/lib/session';
import { supabase } from '~/lib/supabase';

export default function CodeSignIn() {
  useSignedInRedirect();
  return (
    <>
      <AppHeader title="Sign in with a code" back={{ label: 'Sign in' }} />
      <p className="px-4 py-4 text-body text-muted-foreground">We’ll email you a 6-digit code. No password needed.</p>
      <EmailCodeFlow
        sendLabel="Email me a code"
        sendCode={async (email) => {
          const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
          if (error?.message.includes('Signups not allowed')) return 'No account uses that email. Create an account first.';
          return error?.message;
        }}
        verifyCode={async (email, token) => {
          const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
          return error?.message;
        }}
      />
    </>
  );
}
