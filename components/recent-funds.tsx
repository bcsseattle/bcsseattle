'use client';

import { MemberWithCustomers } from '@/types';
import Stripe from 'stripe';
import { Data } from './payments/columns';
import { CardHeader, CardTitle } from './ui/card';
import { DataTable } from './payments/data-table';
import { ColumnDef } from '@tanstack/react-table';

export default function RecentFunds({
  payments = [],
  members = [],
  columns = []
}: {
  payments?: Stripe.PaymentIntent[];
  members?: any[];
  columns?: ColumnDef<Data>[];
}) {
  const data = payments
    ?.filter(
      (payment) => payment.status === 'succeeded' && payment.customer !== null
    )
    .map((payment) => {
      const member = members.find(
        (member) => member.customers?.stripe_customer_id === payment.customer
      );
      return {
        id: payment.id,
        type: payment.description?.includes('Subscription')
          ? 'Contribution'
          : 'Membership',
        member: {
          id: member?.id,
          fullName: member?.fullName,
          totalMembersInFamily: member?.totalMembersInFamily
        },
        date: new Date(payment.created * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        amount: payment.amount
      };
    });

  return (
    <div>
      <CardHeader>
        <CardTitle>Recent Contributions</CardTitle>
      </CardHeader>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
