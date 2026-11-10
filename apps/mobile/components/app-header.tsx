'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * BCS/App header (Figma 13:1953). Large on tab roots: a display title with an
 * optional subtitle and action. Inline on pushed screens (when `back` is set):
 * Back in accent, a centred title and an optional action, pinned to the top.
 * Both sit below the status bar.
 */
export function AppHeader({
  title,
  subtitle,
  action,
  back
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: { label?: string; href?: string };
}) {
  const router = useRouter();

  if (!back) {
    return (
      <header className="flex flex-col gap-1 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="flex min-h-11 items-center justify-between">
          <h1 className="text-display">{title}</h1>
          {action}
        </div>
        {subtitle && <p className="text-body text-muted-foreground">{subtitle}</p>}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-card pt-[env(safe-area-inset-top)]">
      <div className="flex h-13 items-center px-2">
        <div className="flex w-[110px]">
          <button
            type="button"
            onClick={() => (back.href ? router.replace(back.href) : router.back())}
            className="-ml-1 flex h-11 items-center gap-0.5 rounded-md px-1 text-body font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden className="size-5" />
            {back.label ?? 'Back'}
          </button>
        </div>
        <h1 className="min-w-0 flex-1 truncate text-center text-body font-semibold">{title}</h1>
        <div className="flex w-[110px] justify-end">{action}</div>
      </div>
    </header>
  );
}
