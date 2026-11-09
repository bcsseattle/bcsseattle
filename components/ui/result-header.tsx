import * as React from 'react';
import { Check, Clock } from 'lucide-react';

import { cn } from '@/utils/cn';

/**
 * BCS/Result header (Figma 23:2005): the top of a result screen. A tone mark,
 * a Title/Screen heading that states the outcome in words, and a short body.
 * success = done; pending = waiting on payment.
 */
export function ResultHeader({
  tone,
  title,
  children,
  className
}: {
  tone: 'success' | 'pending';
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === 'success' ? Check : Clock;
  return (
    <div className={cn('flex flex-col items-center gap-3 py-2 text-center', className)}>
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          tone === 'success' ? 'bg-badge-green-bg text-badge-green-text' : 'bg-badge-orange-bg text-badge-orange-text'
        )}
      >
        <Icon aria-hidden className="size-6" />
      </div>
      <h1 className="text-screen text-foreground">{title}</h1>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
