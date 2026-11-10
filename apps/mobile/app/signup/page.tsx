'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { AppHeader } from '~/components/app-header';
import { AuthForm, Field } from '~/components/auth-form';
import { useSignedInRedirect } from '~/lib/session';
import { supabase } from '~/lib/supabase';

/**
 * Creates the sign-in account. Applying for membership (the Register form) is
 * the next step, built in Phase 3. When email confirmation is on, Supabase
 * returns no session and the member confirms by email first.
 */
export default function SignUp() {
  useSignedInRedirect();
  const [sentTo, setSentTo] = useState<string>();

  if (sentTo) {
    return (
      <>
        <AppHeader title="Check your email" back={{ label: 'Sign in', href: '/signin/' }} />
        <StatePanel
          icon={MailCheck}
          title="Confirm your email address"
          headingLevel="h2"
          action={
            <Link href="/signin/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Go to sign in
            </Link>
          }
        >
          We sent a link to {sentTo}. Open it, then sign in here.
        </StatePanel>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Create an account" back={{ label: 'Sign in' }} />
      <div className="h-4" />
      <AuthForm
        submitLabel="Create account"
        onSubmit={async (form) => {
          const email = String(form.get('email') ?? '').trim();
          const { data, error } = await supabase.auth.signUp({ email, password: String(form.get('password') ?? '') });
          if (error) return error.message;
          if (!data.session) setSentTo(email);
        }}
      >
        <Field label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
      </AuthForm>
    </>
  );
}
