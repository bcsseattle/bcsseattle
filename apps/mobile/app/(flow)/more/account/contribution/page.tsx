'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { formatDate } from '@/utils/format';
import { getSubscriptionInterval } from '@/utils/helpers';
import { Loaded, Section } from '~/components/screen';
import { FlowScreen } from '~/components/account/flow-screen';
import { priceLabel } from '~/components/account/labels';
import { loadMembership, openBillingPortal } from '~/components/account/membership';
import { api, must } from '~/lib/api';
import { useMember } from '~/lib/member';
import { openOutside } from '~/lib/open';
import { useSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

type Plan = 'contribution' | 'membership';

/**
 * Account › My contribution. With an active plan: what it is and when it
 * renews; changes go through the Stripe portal. Without one: the plans that
 * /contribute and /membership-fee offer, started in Stripe Checkout in the
 * system browser (plan §4).
 */
export default function MyContribution() {
  const userId = useSession().session?.user.id;
  const me = useMember();
  const state = useData(async () => {
    const [{ subscription }, contribution, fee] = await Promise.all([
      loadMembership(userId!),
      must(
        supabase
          .from('products')
          .select('*, prices(*)')
          .eq('active', true)
          .eq('prices.active', true)
          .contains('metadata', { type: 'contribution' })
          .order('metadata->index')
          .order('unit_amount', { referencedTable: 'prices' })
      ),
      must(
        supabase
          .from('products')
          .select('*, prices(*)')
          .eq('active', true)
          .eq('prices.active', true)
          .eq('name', 'Membership Fee')
      )
    ]);
    const plans = (contribution ?? []).flatMap((product) =>
      product.prices
        .filter((price) => (price.metadata as { type?: string } | null)?.type === 'contribution')
        .map((price) => ({ price, product, plan: 'contribution' as Plan }))
    );
    const fees = (fee ?? []).flatMap((product) =>
      product.prices.slice(0, 1).map((price) => ({ price, product, plan: 'membership' as Plan }))
    );
    return { subscription, plans, fees };
  }, [userId]);
  const [choice, setChoice] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const back = { label: 'Account', href: '/more/account/' };
  if (!state.data) {
    return (
      <FlowScreen title="My contribution" back={back}>
        <Loaded state={state}>{() => null}</Loaded>
      </FlowScreen>
    );
  }

  const { subscription, plans, fees } = state.data;
  if (subscription?.prices) {
    const price = subscription.prices;
    return (
      <FlowScreen
        title="My contribution"
        back={back}
        summary="Change, pause or cancel your plan on Stripe, in your browser."
        actions={
          <Button
            size="lg"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await openBillingPortal();
              setPending(false);
            }}
          >
            {pending ? 'Opening Stripe…' : 'Manage plan & payment method'}
          </Button>
        }
      >
        <ListGroup>
          <ListRow label="Plan" value={`${getSubscriptionInterval(price)} contribution`} />
          <ListRow label="Amount" value={priceLabel(price, subscription.quantity)} />
          <ListRow
            label={subscription.cancel_at_period_end ? 'Ends' : 'Renews'}
            value={formatDate(subscription.current_period_end)}
          />
          <ListRow label="Status" value="Active" />
        </ListGroup>
      </FlowScreen>
    );
  }

  // The membership fee is for members who aren't active yet, as on /membership-fee.
  const options = [...plans, ...(me.data?.isActive ? [] : fees)];
  const chosen = options.find((option) => option.price.id === choice);

  return (
    <FlowScreen
      title="Start a plan"
      back={back}
      summary="Payment opens on Stripe’s secure page in your browser."
      actions={
        <Button
          size="lg"
          disabled={!chosen || pending}
          onClick={async () => {
            if (!chosen) return;
            setPending(true);
            setError(undefined);
            try {
              const { url } = await api<{ url: string }>('/api/app/checkout', {
                json: { priceId: chosen.price.id, plan: chosen.plan }
              });
              await openOutside(url);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? 'Opening Stripe…' : 'Continue to secure payment'}
        </Button>
      }
    >
      <p className="text-body text-muted-foreground">
        You don’t have a contribution plan. Choose one to support the community every month or year.
      </p>
      <RadioGroup value={choice} onValueChange={setChoice} aria-label="Plan" className="gap-6">
        {plans.length > 0 && (
          <Section label="Contribution plans">
            <div className="flex flex-col gap-2">
              {plans.map(({ price }) => (
                <OptionCard
                  key={price.id}
                  value={price.id}
                  label={`${getSubscriptionInterval(price)} contribution`}
                  trailing={priceLabel(price)}
                  className="min-h-11"
                />
              ))}
            </div>
          </Section>
        )}
        {!me.data?.isActive && fees.length > 0 && (
          <Section label="Membership fee">
            {fees.map(({ price, product }) => (
              <OptionCard
                key={price.id}
                value={price.id}
                label={product.name ?? 'Membership fee'}
                detail={product.description ?? 'One-time payment'}
                trailing={priceLabel(price)}
                className="min-h-11"
              />
            ))}
          </Section>
        )}
      </RadioGroup>
      {options.length === 0 && <p className="text-body text-muted-foreground">No plans are available right now.</p>}
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
    </FlowScreen>
  );
}
