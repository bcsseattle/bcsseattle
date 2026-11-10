'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppHeader } from '~/components/app-header';
import { AuthForm, Field } from '~/components/auth-form';
import { useRequireSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';

/** Reached signed in: after a reset code or link, or (Phase 3) from Account › Password & sign-in. */
export default function NewPassword() {
  const router = useRouter();
  if (!useRequireSession()) return null;

  return (
    <>
      <AppHeader title="New password" back={{ label: 'Cancel', href: '/home/' }} />
      <div className="h-4" />
      <AuthForm
        submitLabel="Save password"
        onSubmit={async (form) => {
          const password = String(form.get('password') ?? '');
          if (password !== form.get('confirm')) return 'The passwords don’t match.';
          const { error } = await supabase.auth.updateUser({ password });
          if (error) return error.message;
          toast.success('Password saved.');
          router.replace('/home/');
        }}
      >
        <Field label="New password" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
      </AuthForm>
    </>
  );
}
