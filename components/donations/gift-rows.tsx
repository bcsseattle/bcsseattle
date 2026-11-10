import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

/**
 * Receipt rows: label/value pairs in a card-filled group (BCS/List row 13:2112).
 * `truncate` keeps a long value to one line on a phone (the app).
 */
export function ReceiptRows({ rows, truncate }: { rows: [string, React.ReactNode][]; truncate?: boolean }) {
  return (
    <dl className="overflow-hidden rounded-lg border bg-card text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="flex h-13 items-center gap-3 border-b pl-4 pr-3 last:border-b-0">
          <dt className="min-w-0 flex-1 text-foreground">{term}</dt>
          <dd className={cn(truncate ? 'min-w-0 truncate text-right' : 'shrink-0', 'text-muted-foreground')}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The gift summary over Your information and Payment (Figma 24:2635): what,
 * how much, and Edit. `touch` is the app's: a 44pt Edit and a one-line caption.
 */
export function GiftSummaryRow({
  caption,
  amount,
  onEdit,
  touch,
  className
}: {
  caption: React.ReactNode;
  amount: React.ReactNode;
  onEdit?: () => void;
  touch?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-card px-4 py-3', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-caption text-muted-foreground', touch && 'truncate')}>{caption}</span>
        <span className="text-sm font-semibold text-foreground">{amount}</span>
      </div>
      {onEdit && (
        <Button
          type="button"
          variant="link"
          size={touch ? 'lg' : 'sm'}
          className={touch ? 'text-caption font-medium no-underline' : undefined}
          onClick={onEdit}
        >
          Edit<span className="sr-only"> your gift</span>
        </Button>
      )}
    </div>
  );
}
