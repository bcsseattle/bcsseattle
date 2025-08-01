'use client';

/**
 * @file donationColumns.js
 * This file defines the column schema for the Donations table using @tanstack/react-table.
 * It is designed to display donation data for members of a nonprofit organization.
 */

import { Donation } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { getPriceString, paymentMethodMap, purposeTitleMap } from '@/utils/helpers';
import { Badge } from '../ui/badge';

export const donationColumns: ColumnDef<Donation>[] = [
  {
    accessorKey: 'donorName', // Full name of the donor (or organization)
    header: 'Donor Name',
    cell: (info) => info.getValue() || 'Anonymous' // If donorName is null, display 'Anonymous'
  },
  {
    accessorKey: 'donation_description', // Email address of the donor
    header: 'Description',
    cell: (info) => {
      const value = info.getValue<string>();
      return value || '-';
    }
  },
  {
    accessorKey: 'amount', // Donation amount
    header: 'Amount',
    cell: (info) => {
      const value = info.getValue<number>(); // Explicitly type the value
      const formatted = getPriceString(value); // Format the number as a currency string
      return <div className="text-center font-medium">{formatted}</div>;
    }
  },
  {
    accessorKey: 'date', // Date of the donation (ISO string)
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
    accessorKey: 'paymentMethod', // Payment method used for the donation
    header: 'Payment Method',
    cell: (info) => {
      const value = info.getValue<string>();
      return paymentMethodMap[value] || 'N/A'; // If paymentMethod is null, display 'N/A'
    }
  },
  {
    accessorKey: 'purpose', // Description of non-cash donations
    header: 'Purpose',
    cell: (info) => {
      const value = info.getValue<string>();
      return purposeTitleMap[value] || value; // If purpose is null, display the original value
    }
  },
  {
    accessorKey: 'donation_status',
    header: 'Status',
    cell: (info) => {
      const value = info.getValue<string>();
      return (
        <Badge variant={value === 'completed' ? 'secondary' : 'destructive'}>
          {value}
        </Badge>
      );
    }
  }
];
