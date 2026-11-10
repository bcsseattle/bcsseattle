'use client';

import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';

/** Sign out, as a full-width Secondary button (Account · Mobile 19:2698). Same action as the sidebar's. */
export function SignOutButton() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <form onSubmit={(e) => handleRequest(e, SignOut, getRedirectMethod() === 'client' ? router : null)}>
      <input type="hidden" name="pathName" value={pathname} />
      <Button type="submit" variant="outline" size="lg" className="w-full">
        Sign out
      </Button>
    </form>
  );
}
