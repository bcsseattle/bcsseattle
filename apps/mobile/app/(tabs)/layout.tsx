'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '~/lib/session';
import { TabBar } from '~/components/tab-bar';

/** Tab roots: members only, with the tab bar pinned below the content. */
export default function TabsLayout({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && !session) router.replace('/signin/');
  }, [ready, session, router]);

  if (!session) return null;
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">{children}</main>
      <TabBar />
    </div>
  );
}
