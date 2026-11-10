'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppHeader } from '~/components/app-header';
import { useSession } from '~/lib/session';
import { signOut } from '~/lib/supabase';

// Phase 2 has the account card and Sign out; the Membership and Profile rows come in Phase 3.
export default function AccountTab() {
  const { session } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <>
      <AppHeader title="Account" />
      <div className="flex flex-col gap-6 px-4 pb-6">
        <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
          <p className="text-item">Signed in</p>
          <p className="truncate text-body text-muted-foreground">{session?.user.email}</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await signOut();
            router.replace('/signin/');
          }}
        >
          Sign out
        </Button>
      </div>
    </>
  );
}
