import * as React from 'react';

import { cn } from '@/utils/cn';

/**
 * Art Gallery StatTile (Figma 17:105): an overline label, a Figure/Price value
 * and a Caption note. Card fill, border, radius-lg, 16px padding, no shadow.
 */
export function StatTile({
  label,
  value,
  note,
  className
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-lg border bg-card p-4', className)}>
      <div className="text-overline uppercase text-muted-foreground">{label}</div>
      <div className="text-figure text-foreground">{value}</div>
      {note && <div className="text-caption text-muted-foreground">{note}</div>}
    </div>
  );
}
