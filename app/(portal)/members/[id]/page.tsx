import { formatDate, formatMoney } from '@/utils/format';
import { PageHeader } from '@/components/portal/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { createClient } from '@/utils/supabase/server';
import { getTotalCustomerSpent } from '@/utils/supabase/admin';
import RecentFunds from '@/components/recent-funds';
import { individualColumns } from '@/components/payments/columns';

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function Page(props: { 
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const month = searchParams?.month ?? (new Date().getMonth() + 1).toString();
  const year = searchParams?.year ?? new Date().getFullYear().toString();
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from('members')
    .select('*, customers(stripe_customer_id)')
    .eq('id', params?.id)
    .maybeSingle();

  const stripeCustomerId = member?.customers?.stripe_customer_id ?? '';

  // get total spent from customer in stripe
  const totalSpent = await getTotalCustomerSpent({
    customerId: stripeCustomerId
  });

  const totalSpentString = formatMoney(totalSpent);

  const cards = [
    {
      title: 'Member since',
      value: formatDate(member!.created_at)
    },
    {
      title: 'Total Family Members',
      value: member?.totalMembersInFamily
    },
    {
      title: 'Membership type',
      value: member?.membershipType
    },
    {
      title: 'Total Contributions',
      value: totalSpentString
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={member?.fullName} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatTile key={card.title} label={card.title} value={card.value} />
        ))}
      </div>
      <RecentFunds
        members={member ? [member] : []}
        columns={individualColumns}
        stripeCustomerId={stripeCustomerId}
        month={month}
        year={year}
      />
    </div>
  );
}
