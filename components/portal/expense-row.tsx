'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/utils/cn';

/**
 * BCS/Expense row (Figma 9:1426): date, category (with a "Private" tag when
 * members can't see it), payee, description and amount. A table row: use it
 * under headers Date, Category, Payee, Description, Amount.
 *
 * With a `breakdown` (an event's costs and income) the row opens on click to
 * show it underneath. `action` adds a last cell, e.g. an Edit link, under a
 * sixth header.
 */
export function ExpenseRow({
  date,
  category,
  isPrivate = false,
  payee,
  description,
  amount,
  breakdown,
  action
}: {
  date: React.ReactNode;
  category: React.ReactNode;
  isPrivate?: boolean;
  payee?: React.ReactNode;
  description?: React.ReactNode;
  amount: React.ReactNode;
  breakdown?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const breakdownId = React.useId();
  const expandable = Boolean(breakdown);

  return (
    <>
      <TableRow className={cn(expandable && 'cursor-pointer')} onClick={expandable ? () => setOpen((o) => !o) : undefined}>
        <TableCell className="whitespace-nowrap text-muted-foreground">{date}</TableCell>
        <TableCell>
          <span className="flex items-center gap-2">
            {expandable ? (
              // The whole row takes the click; the button is what the keyboard and screen readers get.
              <button
                type="button"
                aria-expanded={open}
                aria-controls={breakdownId}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((o) => !o);
                }}
                className="-ml-1 flex items-center gap-1 rounded-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <ChevronRight aria-hidden className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
                {category}
                <span className="sr-only">, show breakdown</span>
              </button>
            ) : (
              <span className="font-medium">{category}</span>
            )}
            {isPrivate && (
              <Badge tone="neutral" shape="square">
                Private
              </Badge>
            )}
          </span>
        </TableCell>
        <TableCell>{payee}</TableCell>
        <TableCell className="max-w-[28rem] truncate text-muted-foreground">{description}</TableCell>
        <TableCell className="whitespace-nowrap text-right font-medium">{amount}</TableCell>
        {action !== undefined && (
          <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
            {action}
          </TableCell>
        )}
      </TableRow>
      {expandable && open && (
        <TableRow id={breakdownId} className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={action !== undefined ? 6 : 5} className="py-3">
            {breakdown}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
