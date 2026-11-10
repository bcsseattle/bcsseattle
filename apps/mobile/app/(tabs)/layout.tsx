'use client';

import { Suspense, type ReactNode } from 'react';
import { useRequireSession } from '~/lib/session';
import { TabBar } from '~/components/tab-bar';

/** Tab roots and the screens pushed from them: members only, tab bar pinned below. */
export default function TabsLayout({ children }: { children: ReactNode }) {
  if (!useRequireSession()) return null;
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Screens read ?id= with useSearchParams, which a static export needs a Suspense boundary for. */}
      <main className="flex-1">
        <Suspense>{children}</Suspense>
      </main>
      <TabBar />
    </div>
  );
}
