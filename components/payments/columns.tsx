'use client';

import { formatDate, formatMoney } from '@/utils/format';
import { Member } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import Stripe from 'stripe';
import Link from 'next/link';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Data = {
  id: string;
  member?: Partial<Pick<Member, 'id' | 'fullName' | 'totalMembersInFamily'>>;
  date?: string;
  type?: string;
} & Partial<Stripe.PaymentIntent> &
  Partial<Member>;

export const columns: ColumnDef<Data>[] = [
  {
    accessorKey: 'member',
    sortingFn: (rowA, rowB) => {
      const memberA: Member = rowA.getValue('member');
      const memberB: Member = rowB.getValue('member');
      return (memberA?.fullName ?? 'Not in the directory').localeCompare(memberB?.fullName ?? 'Not in the directory');
    },
    header: 'Member',
    cell: ({ row }) => {
      const member: Member = row.getValue('member');
      // A payment with no matching member says so, as in the app (W9).
      if (!member?.id) return <span className="text-muted-foreground">Not in the directory</span>;
      return (
        <Link
          href={`/members/${member.id}`}
          className="text-accent hover:text-foreground focus:text-foreground active:text-foreground"
        >
          {member.fullName || 'Unnamed member'}
        </Link>
      );
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = formatMoney(amount);

      return <div className="text-center font-medium">{formatted}</div>;
    }
  },
  {
    accessorKey: 'type',
    header: 'Type'
  },
  {
    accessorKey: 'date', // Update the accessorKey to match the data key for the date field
    header: 'Payment Date',
    cell: (info) => formatDate(info.getValue<string>()),
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue('date')).getTime();
      const dateB = new Date(rowB.getValue('date')).getTime();
      return dateA - dateB;
    }
  },
  {
    accessorKey: 'member.totalMembersInFamily',
    header: 'Family Size',
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
    header: 'Payment Date',
    cell: (info) => formatDate(info.getValue<string>()),
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue('date')).getTime();
      const dateB = new Date(rowB.getValue('date')).getTime();
      return dateA - dateB;
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = formatMoney(amount);

      return <div className="text-center font-medium">{formatted}</div>;
    }
  },
  {
    accessorKey: 'type',
    header: 'Type'
  }
];
