import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MembershipPlan from '@/components/membership-plan';

export default async function MembershipFeePage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .eq('name', 'Membership Fee')
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  if (!user) {
    return redirect('/signin');
  }

  return (
    <section className="mb-32">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <MembershipPlan user={user} products={products ?? []} />
        </div>
      </div>
    </section>
  );
}
