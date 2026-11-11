'use client';

import { useState } from 'react';
import { compareSortValues, type SortValue } from '@/utils/table-sort';
import type { SortDirection } from './sortable-table-head';

export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => SortValue>
) {
  const [sort, setSort] = useState<{
    key: K;
    direction: 'asc' | 'desc';
  } | null>(null);
  const sortedRows = sort
    ? [...rows].sort((a, b) => {
        const aValue = accessors[sort.key](a);
        const bValue = accessors[sort.key](b);
        // Missing values remain last in either direction.
        if (aValue == null || bValue == null)
          return compareSortValues(aValue, bValue);
        return (
          compareSortValues(aValue, bValue) *
          (sort.direction === 'asc' ? 1 : -1)
        );
      })
    : rows;
  const sortProps = (key: K) => ({
    direction: (sort?.key === key ? sort.direction : false) as SortDirection,
    onSort: () =>
      setSort((current) =>
        current?.key !== key
          ? { key, direction: 'asc' }
          : current.direction === 'asc'
            ? { key, direction: 'desc' }
            : null
      )
  });
  return { sortedRows, sortProps, isSorted: sort !== null };
}
