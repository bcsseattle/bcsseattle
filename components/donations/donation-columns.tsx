'use client';

/**
 * @file donationColumns.js
 * This file defines the column schema for the Donations table using @tanstack/react-table.
 * It is designed to display donation data for members of a nonprofit organization.
 */

import { Donation } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { paymentMethodMap, purposeTitleMap } from '@/utils/helpers';

export const donationColumns: ColumnDef<Donation>[] = [
  {
    accessorKey: 'donorName', // Full name of the donor (or organization)
    header: 'Donor Name',
    cell: (info) => info.getValue() || 'Anonymous' // If donorName is null, display 'Anonymous'
  },
  {
    accessorKey: 'amount', // Donation amount
    header: 'Amount',
    cell: (info) => {
      const value = info.getValue<number>(); // Explicitly type the value
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value / 100); // Convert cents to dollars

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
  }
];
