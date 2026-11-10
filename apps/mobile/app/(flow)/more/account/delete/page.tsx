'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { AuthForm, Field } from '~/components/auth-form';
import { FlowScreen } from '~/components/account/flow-screen';
import { appFetch } from '~/components/account/pdf';
import { useSession } from '~/lib/session';
import { signOut, supabase } from '~/lib/supabase';

type Step = 'explain' | 'password' | 'send-code' | 'code';

/**
 * Account › Delete account (plan §5.1). Says what is deleted and kept (the
 * same words as the website's /account-deletion page), has the member prove
 * it's them with their password or an email code, confirms in a sheet, then
 * deletes. The server only accepts a sign-in from the last 10 minutes; if it
 * says that's too old, the member confirms again.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const email = useSession().session?.user.email ?? '';
  const [step, setStep] = useState<Step>('explain');
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string>();

  const verified = (error?: { message: string } | null) => {
    if (error) return error.message;
    setNotice(undefined);
    setConfirming(true);
  };

  const remove = async () => {
    setPending(true);
    try {
      const response = await appFetch('/api/app/account/delete', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        await signOut().catch(() => undefined);
        toast.success('Your account has been deleted.');
        router.replace('/signin/');
        return;
      }
      setConfirming(false);
      if (response.status === 403) {
        // Signed in too long ago: back through the password or code step.
        setNotice(body.error ?? 'For your security, confirm it’s you again, then delete your account.');
        setStep('password');
      } else {
        setNotice(body.error ?? 'Your account couldn’t be deleted. Please try again, or contact us.');
      }
    } catch {
      setConfirming(false);
      setNotice('Your account couldn’t be deleted. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  const switchMethod = (
    <Button
      type="button"
      variant="link"
      size="lg"
      onClick={() => setStep(step === 'password' ? 'send-code' : 'password')}
    >
      {step === 'password' ? 'Use an email code instead' : 'Use your password instead'}
    </Button>
  );

  return (
    <FlowScreen
      title="Delete account"
      back={{ label: 'Account', href: '/more/account/' }}
      actions={
        step === 'explain' && (
          <Button size="lg" onClick={() => setStep('password')}>
            Continue
          </Button>
        )
      }
    >
      {notice && (
        <Banner tone="error" title="Account not deleted">
          {notice}
        </Banner>
      )}

      {step === 'explain' ? (
        <div className="flex flex-col gap-4 text-body text-foreground">
          <p>Deleting your account is permanent. You’ll confirm it’s you first.</p>
          <div>
            <h2 className="font-semibold">What is deleted</h2>
            <ul className="mt-1 list-disc pl-5">
              <li>Your sign-in, name, email, phone, address and profile.</li>
              <li>Your membership details and any open nominations.</li>
              <li>Your contribution plan, which is cancelled.</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">What we keep, no longer linked to you</h2>
            <ul className="mt-1 list-disc pl-5">
              <li>Votes you cast, so past election results don’t change. Ballots were always secret.</li>
              <li>
                Donation and payment records, which we must keep for tax and accounting. Payment processor records stay
                with Stripe under their retention rules.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="-mx-4 flex flex-col gap-2">
          <p className="px-4 text-body text-muted-foreground">
            {step === 'password' && `Enter the password for ${email} to confirm it’s you.`}
            {step === 'send-code' && `We’ll email a 6-digit code to ${email}.`}
            {step === 'code' && `We sent a 6-digit code to ${email}.`}
          </p>
          {step === 'password' && (
            <AuthForm
              key="password"
              submitLabel="Confirm it’s me"
              footer={switchMethod}
              onSubmit={async (form) =>
                verified(
                  (await supabase.auth.signInWithPassword({ email, password: String(form.get('password') ?? '') }))
                    .error
                )
              }
            >
              <Field label="Password" name="password" type="password" autoComplete="current-password" />
            </AuthForm>
          )}
          {step === 'send-code' && (
            <AuthForm
              key="send-code"
              submitLabel="Email me a code"
              footer={switchMethod}
              onSubmit={async () => {
                const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
                if (error) return error.message;
                setStep('code');
              }}
            >
              {null}
            </AuthForm>
          )}
          {step === 'code' && (
            <AuthForm
              key="code"
              submitLabel="Confirm it’s me"
              footer={
                <Button type="button" variant="link" size="lg" onClick={() => setStep('send-code')}>
                  Send a new code
                </Button>
              }
              onSubmit={async (form) => {
                const code = String(form.get('code') ?? '').replace(/\s/g, '');
                if (!/^\d{6}$/.test(code)) return 'Enter the 6-digit code from the email.';
                return verified((await supabase.auth.verifyOtp({ email, token: code, type: 'email' })).error);
              }}
            >
              <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
            </AuthForm>
          )}
        </div>
      )}

      <ConfirmSheet
        open={confirming}
        onOpenChange={(open) => !pending && setConfirming(open)}
        title="Delete your account?"
        tone="destructive"
        confirmLabel={pending ? 'Deleting…' : 'Delete my account'}
        onConfirm={remove}
        pending={pending}
      >
        Your sign-in, profile and membership are deleted and your contribution plan is cancelled. This can’t be undone.
      </ConfirmSheet>
    </FlowScreen>
  );
}
