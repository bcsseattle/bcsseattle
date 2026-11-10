import * as React from 'react';

import { cn } from '@/utils/cn';

/**
 * A titled panel (Figma 12:1419, 12:1546): a card with a header (Title/Section
 * and a Caption subtitle) over its content, which runs to the card's edges.
 */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pb-3 pt-4">
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="text-section text-foreground">
            {title}
          </h2>
          {subtitle && <p className="mt-0 text-caption text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
