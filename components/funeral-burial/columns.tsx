'use client';

import { formatMoney } from '@/utils/format';
import { ColumnDef } from '@tanstack/react-table';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Data = {
  id: string;
  full_name?: string | null;
  initial_payment?: number;
  second_payment?: number;
  third_payment?: number;
  fourth_payment?: number;
  total_payment?: number;
  additional_comments?: string | null;
  additional_services?: string | null;
};

export const columns: ColumnDef<Data>[] = [
  {
    accessorKey: 'full_name',
    header: 'Member'
  },
  {
    accessorKey: 'initial_payment',
    header: 'Initial payment',
    cell: (info) => formatMoney(info.getValue<number>())
  },
  {
    accessorKey: 'second_payment',
    header: 'First installment',
    cell: (info) => formatMoney(info.getValue<number>())
  },
  {
    accessorKey: 'third_payment',
    header: 'Second installment',
    cell: (info) => formatMoney(info.getValue<number>())
  },
  {
    accessorKey: 'fourth_payment',
    header: 'Third installment',
    cell: (info) => formatMoney(info.getValue<number>())
  },
  {
    accessorKey: 'total_payment',
    header: 'Total',
    cell: (info) => formatMoney(info.getValue<number>())
  },
  {
    accessorKey: 'additional_comments',
    header: 'Additional comments'
  },
  {
    accessorKey: 'additional_services',
    header: 'Additional services'
  }
];
