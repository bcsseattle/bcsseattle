'use client';

import { useRouter } from 'next/navigation';
import { AppHeader } from '~/components/app-header';
import { EmailCodeFlow } from '~/components/auth-form';
import { supabase } from '~/lib/supabase';

/** Reset with the code from the email; the link in the same email also works (§3.3). */
export default function ForgotPassword() {
  const router = useRouter();
  return (
    <>
      <AppHeader title="Reset password" back={{ label: 'Sign in' }} />
      <p className="px-4 py-4 text-body text-muted-foreground">
        We’ll email you a 6-digit code. Enter it here, then choose a new password.
      </p>
      <EmailCodeFlow
        sendLabel="Email me a code"
        sendCode={async (email) => (await supabase.auth.resetPasswordForEmail(email)).error?.message}
        verifyCode={async (email, token) => {
          const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
          if (error) return error.message;
          router.replace('/signin/new-password/');
        }}
      />
    </>
  );
}
