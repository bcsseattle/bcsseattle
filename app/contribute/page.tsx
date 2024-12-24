import Plans from '@/components/plans';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.log(error);
  }

  if (subscription?.status === 'active') {
    return redirect('/account');
  }

  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  return (
    <section className="mb-32">
      <Plans
        user={user}
        products={products ?? []}
        subscription={subscription}
      />
    </section>
  );
}
