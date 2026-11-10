'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppHeader } from '~/components/app-header';
import { AuthForm, Field } from '~/components/auth-form';
import { Loaded } from '~/components/screen';
import { useMember } from '~/lib/member';
import { supabase } from '~/lib/supabase';

/** Account › Name: the sign-in metadata and users.full_name, as the website's updateName does. */
export default function EditName() {
  const router = useRouter();
  const me = useMember();
  return (
    <>
      <AppHeader title="Name" back={{ label: 'Account' }} />
      <p className="px-4 py-4 text-body text-muted-foreground">
        Your full name, or a name you’re comfortable with. Other members see it in the directory.
      </p>
      <Loaded state={me}>
        {({ userId, fullName }) => (
          <AuthForm
            submitLabel="Save name"
            onSubmit={async (form) => {
              const name = String(form.get('fullName') ?? '').trim();
              if (!name) return 'Enter your name.';
              const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
              if (error) return error.message;
              const { error: saveError } = await supabase.from('users').update({ full_name: name }).eq('id', userId);
              if (saveError) return saveError.message;
              toast.success('Name saved.');
              router.back();
            }}
          >
            <Field label="Name" name="fullName" defaultValue={fullName ?? ''} maxLength={64} autoComplete="name" />
          </AuthForm>
        )}
      </Loaded>
    </>
  );
}
