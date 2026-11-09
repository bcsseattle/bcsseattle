import * as React from 'react';

import { cn } from '@/utils/cn';

/**
 * BCS/Action bar (Figma 13:2105): below md, a bar stuck to the bottom of the
 * screen holding an optional summary line and the screen's one primary
 * action, full width. From md up it is an ordinary block in the page, so the
 * action exists once in the DOM at every width.
 */
export function ActionBar({
  summary,
  children,
  className
}: {
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-md:sticky max-md:bottom-0 max-md:z-30 max-md:-mx-4 max-md:border-t max-md:bg-card max-md:px-4 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-3',
        'flex flex-col gap-2 max-md:[&_button]:h-11 max-md:[&_button]:w-full max-md:[&_a]:h-11 max-md:[&_a]:w-full',
        className
      )}
    >
      {summary && <div className="text-caption text-muted-foreground max-md:text-center">{summary}</div>}
      {children}
    </div>
  );
}
