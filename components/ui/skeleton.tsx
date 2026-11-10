import * as React from 'react';

import { cn } from '@/utils/cn';

/**
 * A loading bar (Art Gallery SkeletonRow): surface-muted with a 1.2s shimmer
 * that stops under prefers-reduced-motion. Hidden from assistive technology:
 * wrap a screen of them in <Loading>, which announces the wait once.
 * On the page background (not a card), pass `bg-border` so the bar shows.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-sm bg-muted bg-gradient-to-r from-transparent from-35% via-card/50 via-50% to-transparent to-65% bg-[length:250%_100%] bg-no-repeat motion-safe:animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

/**
 * Art Gallery SkeletonRow: a placeholder at the real row height (52, or 36
 * when dense) so the list doesn't jump when its rows arrive.
 */
function SkeletonRow({ dense = false, className }: { dense?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center gap-4 border-b px-4 last:border-b-0', dense ? 'h-9' : 'h-13', className)}>
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="ml-auto h-3 w-16" />
    </div>
  );
}

/** Rows for a list or table body; at most a screen of them. */
function SkeletonRows({ count = 5, dense, className }: { count?: number; dense?: boolean; className?: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} dense={dense} className={className} />
      ))}
    </>
  );
}

/** A loading region: says "Loading…" once to screen readers, shows the skeletons. */
function Loading({ label = 'Loading…', className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { Loading, Skeleton, SkeletonRow, SkeletonRows };
