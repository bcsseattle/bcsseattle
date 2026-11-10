'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { AppHeader } from '~/components/app-header';
import { AuthForm, Field } from '~/components/auth-form';
import { useSignedInRedirect } from '~/lib/session';
import { supabase } from '~/lib/supabase';

const link = buttonVariants({ variant: 'link', size: 'lg' });

export default function SignIn() {
  useSignedInRedirect();
  return (
    <>
      <AppHeader title="Sign in" subtitle="BCS Seattle members and applicants." />
      <AuthForm
        submitLabel="Sign in"
        onSubmit={async (form) => {
          const { error } = await supabase.auth.signInWithPassword({
            email: String(form.get('email') ?? '').trim(),
            password: String(form.get('password') ?? '')
          });
          return error?.message;
        }}
        footer={
          <>
            <Link href="/signin/code/" className={link}>
              Sign in with an email code
            </Link>
            <Link href="/signin/forgot/" className={link}>
              Forgot your password?
            </Link>
            <Link href="/signup/" className={link}>
              New here? Create an account
            </Link>
          </>
        }
      >
        <Field label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
      </AuthForm>
    </>
  );
}
