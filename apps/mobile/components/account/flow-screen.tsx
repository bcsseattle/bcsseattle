'use client';

import type { ReactNode } from 'react';
import { ActionBar } from '@/components/ui/action-bar';
import { AppHeader } from '~/components/app-header';

/**
 * A commitment-flow screen (no tab bar): the inline header, the content, and
 * the sticky ActionBar holding the one primary action at the bottom.
 */
export function FlowScreen({
  title,
  back,
  actions,
  summary,
  children
}: {
  title: string;
  back: { label?: string; href?: string };
  actions?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader title={title} back={back} />
      <div className="flex flex-1 flex-col gap-6 px-4 pt-4">
        {children}
        {actions ? (
          <ActionBar summary={summary} className="mt-auto">
            {actions}
          </ActionBar>
        ) : (
          <div className="pb-8" />
        )}
      </div>
    </>
  );
}
