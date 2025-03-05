import { Data } from './payments/columns';
import { CardHeader, CardTitle } from './ui/card';
import { DataTable } from './payments/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { getStripePayments } from '@/utils/supabase/admin';

export default async function RecentFunds({
  members = [],
  columns = [],
  stripeCustomerId
}: {
  members?: any[];
  columns?: ColumnDef<Data>[];
  stripeCustomerId?: string;
}) {
  const { data: payments, error } = await getStripePayments({
    customerId: stripeCustomerId
  });

  if (!payments) {
    return <div>No payments found</div>;
  }

  if (error) {
    console.error(error);
    return <div>Error loading payments: ${error}</div>;
  }

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
          : payment?.metadata?.isPrivate === 'true'
            ? 'Donation'
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
