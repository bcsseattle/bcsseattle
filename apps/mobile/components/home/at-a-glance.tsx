'use client';

import Link from 'next/link';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { fundsTotals, memberStats, type FundsSummary } from '@/utils/community';
import { formatMoney } from '@/utils/format';
import { PLAN_SUBSCRIPTION_SELECT } from '@/utils/membership/plan';
import { api, must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData, type DataState } from '~/lib/use-data';

type Glance = { money: ReturnType<typeof fundsTotals>; people: ReturnType<typeof memberStats> };

/**
 * Home › BCS at a glance's figures: available funds, members and contributing
 * members, worked out as the Funds and Members screens do (utils/community.ts).
 * Home calls this as it opens, so these load alongside its other data. Only
 * active members can read them (RLS); for anyone else it loads nothing.
 */
export function useAtAGlance(active: boolean): DataState<Glance | null> {
  return useData(async () => {
    if (!active) return null;
    const [funds, expenses, donations, members, subscriptions, summary] = await Promise.all([
      must(supabase.from('funds').select('amount').neq('status', 'cancelled').neq('status', 'failed').neq('is_private', true)),
      must(supabase.from('expenses').select('amount').eq('is_private', false)),
      must(
        supabase.from('donations').select('donation_amount, payment_method').eq('is_private', false).eq('donation_status', 'completed')
      ),
      must(supabase.from('members').select('user_id, isApproved, status, totalMembersInFamily')),
      must(supabase.from('subscriptions').select(PLAN_SUBSCRIPTION_SELECT)),
      // Not fatal: without it the bank is estimated from records, as on Funds.
      api<FundsSummary>('/api/app/community-funds/summary').catch(() => null)
    ]);
    return {
      money: fundsTotals({ funds: funds ?? [], expenses: expenses ?? [], donations: donations ?? [], summary }),
      people: memberStats(members ?? [], subscriptions ?? [])
    };
  }, [active]);
}

const heading = (
  <div className="flex items-center justify-between">
    <h2 id="glance-heading" className="text-section text-foreground">
      BCS at a glance
    </h2>
    <Link
      href="/funds/"
      className="-mr-2 flex min-h-11 items-center rounded-md px-2 text-caption font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Community funds
    </Link>
  </div>
);

/** A tile-shaped placeholder: overline, figure, note. */
function TileSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`flex flex-col gap-2 rounded-lg border bg-card p-4 ${className ?? ''}`}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-40 max-w-full" />
    </div>
  );
}

/**
 * The section's shape while it loads, so Home doesn't jump when the figures
 * arrive. Silent: whatever holds it announces the wait (Loading).
 */
export function AtAGlanceSkeleton() {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="glance-heading">
      {heading}
      <div className="flex flex-col gap-2">
        <TileSkeleton />
        <div className="grid grid-cols-2 gap-2">
          <TileSkeleton />
          <TileSkeleton />
        </div>
      </div>
    </section>
  );
}

/** Home › BCS at a glance. Skeleton while loading; hidden if it can't load, so the rest of Home stands on its own. */
export function AtAGlance({ state }: { state: DataState<Glance | null> }) {
  if (state.error) return null;
  if (state.data === undefined)
    return (
      <Loading label="Loading BCS at a glance…">
        <AtAGlanceSkeleton />
      </Loading>
    );
  if (!state.data) return null;
  const { money, people } = state.data;
  const share = people.registered ? Math.round((people.contributing / people.registered) * 100) : 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="glance-heading">
      {heading}
      <StatTile
        label="Available funds"
        value={formatMoney(money.available)}
        note={money.bankEstimated ? 'Bank (estimated from records) + Stripe' : 'Bank + Stripe'}
      />
      <div className="grid grid-cols-2 gap-2">
        <Link href="/more/members/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatTile className="h-full" label="Members" value={people.registered} note={`${people.people} people in their families`} />
        </Link>
        <Link href="/more/members/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatTile className="h-full" label="Contributing" value={people.contributing} note={`${share}% of members have a plan`} />
        </Link>
      </div>
    </section>
  );
}
