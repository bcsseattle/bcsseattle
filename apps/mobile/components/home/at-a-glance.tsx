'use client';

import Link from 'next/link';
import { StatTile } from '@/components/ui/stat-tile';
import { fundsTotals, memberStats, type FundsSummary } from '@/utils/community';
import { formatMoney } from '@/utils/format';
import { PLAN_SUBSCRIPTION_SELECT } from '@/utils/membership/plan';
import { api, must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/**
 * Home › BCS at a glance: available funds, members and contributing members,
 * worked out as the Funds and Members screens do (utils/community.ts). For
 * active members only, the people RLS lets read these. Loaded on its own, so
 * a slow or failed load never holds up the rest of Home; on failure it hides.
 */
export function AtAGlance() {
  const state = useData(async () => {
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
  }, []);

  const data = state.data;
  if (!data) return null; // nothing while loading or on failure; the rest of Home stands on its own
  const { money, people } = data;
  const share = people.registered ? Math.round((people.contributing / people.registered) * 100) : 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="glance-heading">
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
      <StatTile
        label="Available funds"
        value={formatMoney(money.available)}
        note={money.bankEstimated ? 'Bank (estimated from records) + Stripe' : 'Bank + Stripe'}
      />
      <div className="grid grid-cols-2 gap-2">
        <Link href="/more/members/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatTile
            className="h-full"
            label="Members"
            value={people.registered}
            note={`${people.people} people in their families`}
          />
        </Link>
        <Link href="/more/members/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatTile className="h-full" label="Contributing" value={people.contributing} note={`${share}% of members have a plan`} />
        </Link>
      </div>
    </section>
  );
}
