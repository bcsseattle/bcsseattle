'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '~/lib/session';

/** The app opens here: Home when signed in, otherwise Sign in. */
export default function Start() {
  const { session, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(session ? '/home/' : '/signin/');
  }, [ready, session, router]);
  return null;
}
