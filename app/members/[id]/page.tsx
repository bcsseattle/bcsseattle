import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonIcon } from '@radix-ui/react-icons';
import { createClient } from '@/utils/supabase/server';
import { ClockIcon, DollarSign, TypeIcon } from 'lucide-react';
import { getTotalCustomerSpent } from '@/utils/supabase/admin';

export default async function Page({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from('members')
    .select('*, customers(stripe_customer_id)')
    .eq('id', params?.id)
    .maybeSingle();

  // get total spent from customer in stripe
  const totalSpent = await getTotalCustomerSpent(
    member?.customers?.stripe_customer_id
  );

  const totalSpentString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(totalSpent / 100);

  const cards = [
    {
      title: 'Member since',
      icon: ClockIcon,
      value: new Date(member?.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    },
    {
      title: 'Total Family Members',
      icon: PersonIcon,
      value: member?.totalMembersInFamily
    },
    {
      title: 'Membership type',
      icon: TypeIcon,
      value: member?.membershipType
    },
    {
      title: 'Total Contributions',
      icon: DollarSign,
      value: totalSpentString
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold p-2 my-5 text-secondary">
        {member?.fullName}
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="w-6 h-6" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
