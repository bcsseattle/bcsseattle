import { Data } from './payments/columns';
import { CardHeader, CardTitle } from './ui/card';
import { DataTable } from './payments/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { getStripePayments } from '@/utils/supabase/admin';
import Stripe from 'stripe';

const monthsOptions = [
  {
    value: '1',
    label: 'January'
  },
  {
    value: '2',
    label: 'February'
  },
  {
    value: '3',
    label: 'March'
  },
  {
    value: '4',
    label: 'April'
  },
  {
    value: '5',
    label: 'May'
  },
  {
    value: '6',
    label: 'June'
  },
  {
    value: '7',
    label: 'July'
  },
  {
    value: '8',
    label: 'August'
  },
  {
    value: '9',
    label: 'September'
  },
  {
    value: '10',
    label: 'October'
  },
  {
    value: '11',
    label: 'November'
  },
  {
    value: '12',
    label: 'December'
  }
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const yearOptions = [
  {
    value: '2024',
    label: '2024'
  },
  {
    value: currentYear.toString(),
    label: currentYear.toString()
  }
];

export default async function RecentFunds({
  members = [],
  columns = [],
  stripeCustomerId,
  month,
  year
}: {
  members?: any[];
  columns?: ColumnDef<Data>[];
  stripeCustomerId?: string;
  month?: string;
  year?: string;
}) {
  const startDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

  const dateRange: Stripe.RangeQueryParam = {
    gte: Math.floor(startDate.getTime() / 1000),
    lte: Math.floor(endDate.getTime() / 1000)
  };

  const { data: payments, error } = await getStripePayments({
    customerId: stripeCustomerId,
    dateRange
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
      <DataTable
        columns={columns}
        data={data}
        monthOptions={monthsOptions}
        yearOptions={yearOptions}
        month={month}
        year={year}
      />
    </div>
  );
}
