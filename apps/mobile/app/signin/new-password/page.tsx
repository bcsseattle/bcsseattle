'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AppHeader } from '~/components/app-header';
import { AuthForm, Field } from '~/components/auth-form';
import { useRequireSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';

/**
 * Reached signed in: after a reset code or link (then it returns to Home), or
 * from Account › Password & sign-in with ?from=account (then back to Account).
 */
export default function NewPasswordPage() {
  return (
    <Suspense>
      <NewPassword />
    </Suspense>
  );
}

function NewPassword() {
  const router = useRouter();
  const fromAccount = useSearchParams().get('from') === 'account';
  const done = fromAccount ? '/more/account/' : '/home/';
  if (!useRequireSession()) return null;

  return (
    <>
      <AppHeader
        title="New password"
        back={fromAccount ? { label: 'Account', href: done } : { label: 'Cancel', href: done }}
      />
      <div className="h-4" />
      <AuthForm
        submitLabel="Save password"
        onSubmit={async (form) => {
          const password = String(form.get('password') ?? '');
          if (password !== form.get('confirm')) return 'The passwords don’t match.';
          const { error } = await supabase.auth.updateUser({ password });
          if (error) return error.message;
          toast.success('Password saved.');
          router.replace(done);
        }}
      >
        <Field label="New password" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
      </AuthForm>
    </>
  );
}
