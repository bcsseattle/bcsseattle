'use client';

import { ColumnDef } from '@tanstack/react-table';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Data = {
  id: string;
};

export const columns: ColumnDef<Data>[] = [
  {
    accessorKey: 'full_name',
    header: 'Member'
  },
  {
    accessorKey: 'initial_payment',
    header: 'Initial payment'
  },
  {
    accessorKey: 'second_payment',
    header: 'First installment'
  },
  {
    accessorKey: 'third_payment',
    header: 'Second installment'
  },
  {
    accessorKey: 'fourth_payment',
    header: 'Third installment'
  },
  {
    accessorKey: 'total_payment',
    header: 'Total'
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
