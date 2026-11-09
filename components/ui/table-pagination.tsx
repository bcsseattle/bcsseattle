'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Art Gallery Pagination (Figma 34:191) for a TanStack table: the range and
 * total ("1–10 of 42"), then previous / next as 28px outline icon buttons
 * with accessible names, disabled at the ends. (No page-size menu: the
 * tables use a fixed size.)
 */
export function TablePagination<T>({ table }: { table: Table<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const first = total === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min(total, (pageIndex + 1) * pageSize);
  return (
    <div className="flex items-center justify-end gap-3 py-3">
      <span className="text-caption text-muted-foreground" aria-live="polite">
        {first}–{last} of {total.toLocaleString('en-US')}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        aria-label="Previous page"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        aria-label="Next page"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}
