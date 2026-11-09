import * as React from 'react';
import { Check, Clock } from 'lucide-react';

import { cn } from '@/utils/cn';

export type StepState = 'done' | 'current' | 'upcoming';

const stateWord: Record<StepState, string> = {
  done: 'Done',
  current: 'In progress',
  upcoming: 'Upcoming'
};

/**
 * Art Gallery TransactionStep (Figma 11:828), used as the election phase
 * timeline: Done (green check), current (orange clock) and Upcoming (hollow
 * ring, muted text). The marker's shape and a screen-reader word carry the
 * state, not colour alone.
 */
export function TransactionStep({
  label,
  detail,
  state,
  className
}: {
  label: React.ReactNode;
  detail?: React.ReactNode;
  state: StepState;
  className?: string;
}) {
  return (
    <li className={cn('flex min-w-0 items-start gap-2.5', className)}>
      <span aria-hidden className="flex h-5 w-4 shrink-0 items-center justify-center">
        {state === 'done' && <Check className="size-4 text-badge-green-text" />}
        {state === 'current' && <Clock className="size-4 text-badge-orange-text" />}
        {state === 'upcoming' && <span className="size-2.5 rounded-full border-[1.5px] border-border-strong" />}
      </span>
      <span className={cn('flex min-w-0 flex-col', state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')}>
        <span className="text-sm">
          {label}
          <span className="sr-only"> ({stateWord[state]})</span>
        </span>
        {detail && <span className="text-caption text-muted-foreground">{detail}</span>}
      </span>
    </li>
  );
}

/** A row of steps (stacked below md), as an ordered list. */
export function TransactionSteps({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ol className={cn('grid gap-3 md:grid-flow-col md:auto-cols-fr md:gap-4', className)}>{children}</ol>;
}
