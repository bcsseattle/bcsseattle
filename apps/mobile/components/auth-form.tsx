'use client';

import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** A labelled input at touch height (44px). */
export function Field({ label, ...props }: { label: string } & ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11" {...props} />
    </div>
  );
}

/**
 * A form whose submit returns an error message or nothing. Shows the error
 * above the one primary button and disables it while the request runs.
 */
export function AuthForm({
  submitLabel,
  onSubmit,
  children,
  footer
}: {
  submitLabel: string;
  onSubmit: (form: FormData) => Promise<string | void>;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    try {
      setError((await onSubmit(new FormData(event.currentTarget))) || undefined);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4 px-4 pb-8">
      {children}
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Please wait…' : submitLabel}
      </Button>
      {footer && <div className="flex flex-col items-center gap-1">{footer}</div>}
    </form>
  );
}

/**
 * Two steps on one screen: the email address, then the 6-digit code Supabase
 * sends. Used for code sign-in and for password reset.
 */
export function EmailCodeFlow({
  sendCode,
  verifyCode,
  sendLabel
}: {
  sendCode: (email: string) => Promise<string | void>;
  verifyCode: (email: string, code: string) => Promise<string | void>;
  sendLabel: string;
}) {
  const [email, setEmail] = useState<string>();

  if (!email) {
    return (
      <AuthForm
        submitLabel={sendLabel}
        onSubmit={async (form) => {
          const value = String(form.get('email') ?? '').trim();
          if (!value) return 'Enter your email address.';
          const error = await sendCode(value);
          if (error) return error;
          setEmail(value);
        }}
      >
        <Field label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" />
      </AuthForm>
    );
  }

  return (
    <AuthForm
      key="code"
      submitLabel="Verify code"
      onSubmit={async (form) => {
        const code = String(form.get('code') ?? '').replace(/\s/g, '');
        if (!/^\d{6}$/.test(code)) return 'Enter the 6-digit code from the email.';
        return verifyCode(email, code);
      }}
      footer={
        <Button type="button" variant="link" size="lg" onClick={() => setEmail(undefined)}>
          Use a different email or send a new code
        </Button>
      }
    >
      <p className="text-body text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
      </p>
      <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
    </AuthForm>
  );
}
