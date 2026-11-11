'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { flexRender, type Header } from '@tanstack/react-table';
import { TableHead } from '@/components/ui/table';

export type SortDirection = false | 'asc' | 'desc';

type SortableTableHeadProps = React.ComponentProps<typeof TableHead> & {
  direction: SortDirection;
  onSort: React.MouseEventHandler<HTMLButtonElement>;
};

export function SortableTableHead({
  direction,
  onSort,
  children,
  ...props
}: SortableTableHeadProps) {
  const Icon =
    direction === 'asc'
      ? ArrowUp
      : direction === 'desc'
        ? ArrowDown
        : ArrowUpDown;
  return (
    <TableHead
      {...props}
      aria-sort={
        direction === 'asc'
          ? 'ascending'
          : direction === 'desc'
            ? 'descending'
            : 'none'
      }
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex min-h-9 items-center gap-2 rounded-sm text-inherit hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span className="sr-only">
          {direction === 'asc'
            ? 'Sorted ascending'
            : direction === 'desc'
              ? 'Sorted descending'
              : 'Sort column'}
        </span>
      </button>
    </TableHead>
  );
}

export function DataTableHead<TData, TValue>({
  header
}: {
  header: Header<TData, TValue>;
}) {
  const content = header.isPlaceholder
    ? null
    : flexRender(header.column.columnDef.header, header.getContext());
  if (header.isPlaceholder || !header.column.getCanSort())
    return <TableHead>{content}</TableHead>;
  return (
    <SortableTableHead
      direction={header.column.getIsSorted()}
      onSort={(event) => header.column.getToggleSortingHandler()?.(event)}
    >
      {content}
    </SortableTableHead>
  );
}
