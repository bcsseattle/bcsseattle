import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/utils/cn';

/** A card-filled group of ListRows (radius-lg). */
export function ListGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>{children}</div>;
}

/**
 * BCS/List row (Figma 13:2112): 52px, an optional icon, a label, an optional
 * muted value and a chevron when it links somewhere.
 */
export function ListRow({
  label,
  value,
  icon: Icon,
  href
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
}) {
  const body = (
    <>
      {Icon && <Icon aria-hidden className="size-4 shrink-0 text-foreground" />}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{label}</span>
      {value && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}
      {href && <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const row = 'flex h-13 items-center gap-3 border-b pl-4 pr-3 last:border-b-0';
  return href ? (
    <Link
      href={href}
      className={cn(row, 'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
    >
      {body}
    </Link>
  ) : (
    <div className={row}>{body}</div>
  );
}
