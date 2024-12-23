'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '../card';
import { Donation, Member } from '@/types';
import { getPriceString } from '@/utils/helpers';
import { Button } from '../button';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'donation_description', // Email address of the donor
    header: 'Description',
    cell: (info) => {
      const value = info.getValue<string>();
      return value || '-';
    }
  },
  {
    accessorKey: 'donation_amount', // Donation amount
    header: 'Amount',
    cell: (info) => {
      const value = info.getValue<number>(); // Explicitly type the value
      const formatted = getPriceString(value); // Format the number as a currency string
      return <div className="font-medium">{formatted}</div>;
    }
  },
  {
    accessorKey: 'donation_date', // Date of the donation (ISO string)
    header: 'Date',
    cell: (info) => {
      const value = info.getValue<string | null>();
      if (!value) {
        return 'N/A'; // Fallback for null or undefined values
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString(); // Fallback for invalid dates
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const donation = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <>
                <Link href={`/donate/confirmation/${donation.id}`}>View</Link>
              </>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <>
                <Link href={`/donate/confirmation/${donation.id}/pdf`}>
                  Download
                </Link>
              </>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];

export default function DonationTable({
  donations
}: {
  donations: Donation[];
}) {
  const table = useReactTable({
    data: donations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {}
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
