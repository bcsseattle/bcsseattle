import Plans from '@/components/plans';
import { Subscription, SubscriptionWithProduct } from '@/types';
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

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('status', 'active')
    .eq('prices.products.metadata->>type', 'contribution')
    .eq('user_id', user.id);

  if (error) {
    console.log('error fetching subscriptions:', error);
    return redirect('/account');
  }

  // Get the first active contribution subscription or null if none exist
  const subscription =
    subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

  if (subscription && subscription?.status === 'active') {
    return redirect('/account');
  }

  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .contains('metadata', { type: 'contribution' })
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
        subscription={subscription as SubscriptionWithProduct}
      />
    </section>
  );
}
