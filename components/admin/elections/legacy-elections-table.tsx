'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/components/ui/use-table-sort';
import { formatDate } from '@/utils/format';

type Election = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

export function LegacyElectionsTable({ elections }: { elections: Election[] }) {
  const { sortedRows, sortProps } = useTableSort(elections, {
    title: (e) => e.title,
    period: (e) => e.start_date,
    status: (e) => e.status
  });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead {...sortProps('title')}>
            Election
          </SortableTableHead>
          <SortableTableHead {...sortProps('period')}>
            Voting period
          </SortableTableHead>
          <SortableTableHead {...sortProps('status')}>Status</SortableTableHead>
          <TableHead className="text-right">Links</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.title}</TableCell>
            <TableCell>
              {formatDate(e.start_date)} – {formatDate(e.end_date)}
            </TableCell>
            <TableCell>
              <Badge variant={e.status === 'Open' ? 'default' : 'secondary'}>
                {e.status}
              </Badge>
            </TableCell>
            <TableCell className="space-x-3 text-right">
              <Link className="underline" href={`/elections/${e.id}`}>
                View
              </Link>
              <Link className="underline" href={`/elections/${e.id}/results`}>
                Results
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
