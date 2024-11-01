'use client';

import { Member } from '@/types';
import Stripe from 'stripe';
import { columns } from './payments/columns';
import { CardHeader, CardTitle } from './ui/card';
import { DataTable } from './payments/data-table';

export default function RecentFunds({
  payments = [],
  members = []
}: {
  payments?: Stripe.PaymentIntent[];
  members?: Member[];
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
        amount: payment.amount,
      };
    });

  return (
    <div>
      <CardHeader>
        <CardTitle>Recent funds</CardTitle>
      </CardHeader>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
