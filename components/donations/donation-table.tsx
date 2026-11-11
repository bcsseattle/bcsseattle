'use client';
import { DataTableHead } from '@/components/ui/sortable-table-head';

import React from 'react';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  getPaginationRowModel
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { donationColumns } from './donation-columns'; // Import column definitions
import { Donation } from '@/types';

type DonationTableProps = {
  data: Donation[];
};

const DonationTable: React.FC<DonationTableProps> = ({ data }) => {
  const table = useReactTable({
    data,
    columns: donationColumns,
    getCoreRowModel: getCoreRowModel(),
    sortDescFirst: false,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5
      }
    }
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <DataTableHead key={header.id} header={header} />
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
                  colSpan={donationColumns.length}
                  className="h-24 text-center"
                >
                  No donations.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination table={table} />
    </div>
  );
};

export default DonationTable;
