'use client';

import { Suspense, type ReactNode } from 'react';
import { useRequireSession } from '~/lib/session';

/**
 * Commitment flows (giving, voting, nominating): members only, no tab bar, so
 * the screen's own Back and its sticky action bar are the only ways on.
 */
export default function FlowLayout({ children }: { children: ReactNode }) {
  if (!useRequireSession()) return null;
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense>{children}</Suspense>
    </div>
  );
}
