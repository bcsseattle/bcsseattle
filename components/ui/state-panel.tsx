import * as React from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';

import { cn } from '@/utils/cn';

/**
 * Art Gallery StatePanel (Figma 33:134): Empty, No results, Error or No access.
 * An icon on a surface-muted disc, a Title/Item heading, a muted body and at
 * most one action.
 */
export function StatePanel({
  title,
  children,
  action,
  icon: Icon = Inbox,
  headingLevel: Heading = 'h2',
  className
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('mx-auto flex max-w-[400px] flex-col items-center gap-2 px-6 py-10 text-center', className)}>
      <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden className="size-[18px] text-foreground" />
      </div>
      <Heading className="text-item text-foreground">{title}</Heading>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
