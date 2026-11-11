import Plans from '@/components/plans';
import { Price, SubscriptionWithProduct } from '@/types';
import { PageHeader } from '@/components/portal/page-header';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { ManagePlanButton } from '@/components/portal/manage-plan-button';
import { formatDate } from '@/utils/format';
import { getSubscriptionInterval } from '@/utils/helpers';
import { priceLabel } from '@/utils/membership/plan';
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

  // The active contribution plan: the nested filter blanks the product of any
  // other subscription (a monthly donation) rather than dropping the row.
  const subscription = subscriptions?.find((s) => s.prices?.products) ?? null;

  // My contribution, for a member with a plan (as the app's screen): what it
  // is, when it renews, the Stripe portal for changes, and this year's
  // statement. It used to send them to /account.
  if (subscription?.prices) {
    const price = subscription.prices as unknown as Price;
    const { data: me } = await supabase.from('members').select('id').eq('user_id', user.id).maybeSingle();
    const year = new Date().getFullYear();
    return (
      <div className="flex max-w-[720px] flex-col gap-6">
        <PageHeader title="My contribution" description="Change, pause or cancel your plan on Stripe." />
        <ListGroup>
          <ListRow label="Plan" value={`${getSubscriptionInterval(price)} contribution`} />
          <ListRow label="Amount" value={priceLabel(price, subscription.quantity)} />
          <ListRow
            label={subscription.cancel_at_period_end ? 'Ends' : 'Renews'}
            value={formatDate(subscription.current_period_end)}
          />
          <ListRow label="Status" value="Active" />
        </ListGroup>
        <div>
          <ManagePlanButton />
        </div>
        {me && (
          <p className="mt-0 text-sm text-muted-foreground">
            <a href={`/account/${me.id}/contributions/pdf?taxYear=${year}`} className="text-accent underline underline-offset-4">
              Download your {year} contribution statement (PDF)
            </a>{' '}
            for your tax records.
          </p>
        )}
      </div>
    );
  }

  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .contains('metadata', { type: 'contribution' })
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return (
    <section className="pb-8">
      <Plans
        user={user}
        products={products ?? []}
        subscription={subscription as SubscriptionWithProduct}
      />
    </section>
  );
}
