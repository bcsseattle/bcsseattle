'use client';

import { Member } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import Stripe from 'stripe';
import { Button } from '../ui/button';
import Link from 'next/link';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Data = {
  id: string;
} & Partial<Stripe.PaymentIntent> &
  Partial<Member>;

export const columns: ColumnDef<Data>[] = [
  {
    accessorKey: 'member',
    sortingFn: (rowA, rowB) => {
      const memberA: Member = rowA.getValue('member');
      const memberB: Member = rowB.getValue('member');
      return memberA?.fullName?.localeCompare(memberB.fullName || '') || 0;
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Member
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const member: Member = row.getValue('member');
      return (
        <Link
          href={`/members/${member?.id}`}
          className="text-blue-500 hover:text-blue-700 focus:text-blue-700 active:text-blue-800"
        >
          {member?.fullName}
        </Link>
      );
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(amount / 100);

      return <div className="text-center font-medium">{formatted}</div>;
    }
  },
  {
    accessorKey: 'type',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  },
  {
    accessorKey: 'date', // Update the accessorKey to match the data key for the date field
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Payment Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue('date')).getTime();
      const dateB = new Date(rowB.getValue('date')).getTime();
      return dateA - dateB;
    }
  },
  {
    accessorKey: 'member.totalMembersInFamily',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Family Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const member: Member = row.getValue('member');
      return (
        <div className="text-right w-1/3">{member?.totalMembersInFamily}</div>
      );
    }
  }
];

export const individualColumns: ColumnDef<Data>[] = [
  {
    accessorKey: 'date', // Update the accessorKey to match the data key for the date field
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Payment Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue('date')).getTime();
      const dateB = new Date(rowB.getValue('date')).getTime();
      return dateA - dateB;
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(amount / 100);

      return <div className="text-center font-medium">{formatted}</div>;
    }
  },
  {
    accessorKey: 'type',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    }
  }
];
