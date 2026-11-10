'use client';

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';
import { AppHeader } from '~/components/app-header';
import { AuthForm, Field } from '~/components/auth-form';
import { useSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';

/** Account › Email. Supabase emails both addresses; the change takes effect once both links are opened. */
export default function EditEmail() {
  const current = useSession().session?.user.email ?? '';
  const [sentTo, setSentTo] = useState<string>();

  return (
    <>
      <AppHeader title="Email" back={{ label: 'Account' }} />
      {sentTo ? (
        <StatePanel icon={MailCheck} title="Confirm the change">
          We sent a confirmation email to {current} and to {sentTo}. Open the link in both and you’ll sign in with{' '}
          {sentTo} from then on. Until then, keep using {current}.
        </StatePanel>
      ) : (
        <>
          <p className="px-4 py-4 text-body text-muted-foreground">
            The email you sign in with and get receipts at. A confirmation email follows to check it’s yours.
          </p>
          <AuthForm
            submitLabel="Change email"
            onSubmit={async (form) => {
              const email = String(form.get('email') ?? '').trim();
              if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.';
              if (email.toLowerCase() === current.toLowerCase()) return 'That’s already your email address.';
              const { error } = await supabase.auth.updateUser({ email });
              if (error) return error.message;
              setSentTo(email);
            }}
          >
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={current}
              maxLength={64}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </AuthForm>
        </>
      )}
    </>
  );
}
