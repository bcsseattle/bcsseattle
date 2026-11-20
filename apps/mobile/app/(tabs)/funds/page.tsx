'use client';

import { useState } from 'react';
import { Gift, Receipt } from 'lucide-react';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { MoneyRow } from '@/components/portal/money-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatePanel } from '@/components/ui/state-panel';
import { StatTile } from '@/components/ui/stat-tile';
import { formatDate, formatMoney } from '@/utils/format';
import { paidWith } from '@/utils/giving';
import { purposeTitleMap } from '@/utils/helpers';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import { CappedMoneyList } from '~/components/home/capped-money-list';
import { MembersOnly } from '~/components/home/membership';
import { MonthPayments } from '~/components/home/month-payments';
import { fundsTotals, type FundsSummary } from '@/utils/community';
import { api, must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData, type DataState } from '~/lib/use-data';
import { Skeleton } from '@/components/ui/skeleton';

type Summary = FundsSummary;

/** The records the screen lists, read under RLS (members see the public ones). */
async function loadRecords() {
  const [funds, expenses, donations, members] = await Promise.all([
    must(supabase.from('funds').select('amount').neq('status', 'cancelled').neq('status', 'failed').neq('is_private', true)),
    must(supabase.from('expenses').select('*').eq('is_private', false).order('date', { ascending: false })),
    must(
      supabase
        .from('donations')
        .select('id, donation_amount, donation_date, payment_method, purpose, is_anonymous, donors(full_name, organization_name)')
        .eq('is_private', false)
        .eq('donation_status', 'completed')
        .order('donation_date', { ascending: false })
    ),
    must(supabase.from('members').select('fullName, customers(stripe_customer_id)'))
  ]);
  return { funds: funds ?? [], expenses: expenses ?? [], donations: donations ?? [], members: members ?? [] };
}

/**
 * Community funds (Figma 19:2389), the same data as the website's
 * /community-funds. Approved active members only.
 *
 * Both loads start as the screen opens, without waiting for the membership
 * check (for anyone else, RLS returns nothing and the summary refuses). The
 * records show as soon as they arrive; only the Stripe figures wait for the
 * summary, which the website keeps for a few minutes (utils/funds-cache.ts).
 */
export default function FundsTab() {
  const records = useData(loadRecords);
  // Not fatal: without it the bank is estimated from records, as the website does before a bank is linked.
  const summary = useData(() => api<Summary>('/api/app/community-funds/summary').catch(() => null));
  return (
    <>
      <AppHeader
        title="Community funds"
        subtitle="Where BCS Seattle’s money is and where it goes."
      />
      <div className="flex flex-col gap-6 px-4 pb-6 pt-2">
        <MembersOnly>{() => <Funds records={records} summary={summary} />}</MembersOnly>
      </div>
    </>
  );
}

function Funds({
  records,
  summary: summaryState
}: {
  records: DataState<Awaited<ReturnType<typeof loadRecords>>>;
  summary: DataState<Summary | null>;
}) {
  const [tab, setTab] = useState('contributions');
  // Until the summary answers, its figures show as placeholders, not the estimate (which would then jump).
  const waiting = summaryState.data === undefined;
  const summary = summaryState.data ?? null;
  const figure = (value: string, width = 'w-24') => (waiting ? <Skeleton className={`inline-block h-4 ${width} align-middle`} /> : value);

  return (
    <Loaded state={records}>
      {({ funds, expenses, donations, members }) => {
        // The website's figures (app/(portal)/community-funds), worked out as Home does.
        const { received, offline, spent, bank, stripe } = fundsTotals({ funds, expenses, donations, summary });
        // members.stripe_customer_id points at customers.id; the Stripe id is on customers.
        const names = new Map(
          members.flatMap((m) =>
            m.customers?.stripe_customer_id
              ? [[m.customers.stripe_customer_id, m.fullName ?? 'Member']]
              : []
          )
        );

        return (
          <>
            <section aria-label="Overview" className="flex flex-col gap-2">
              <StatTile
                label="Available funds"
                value={figure(formatMoney(bank + stripe), 'w-40 h-7')}
                note={waiting ? 'Bank + Stripe' : `Bank + ${formatMoney(stripe)} in Stripe`}
              />
              <ListGroup>
                <ListRow label="Bank balance" value={figure(formatMoney(bank))} />
                <ListRow label="In Stripe" value={figure(formatMoney(stripe))} />
                <ListRow label="Expenses" value={formatMoney(-spent)} />
                {(waiting || summary) && <ListRow label="Processing fees" value={figure(formatMoney(-(summary?.stripeFees ?? 0)))} />}
              </ListGroup>
              <p className="px-1 text-caption text-muted-foreground">
                {waiting
                  ? 'Getting the latest balances…'
                  : summary?.bankAsOf
                  ? `Bank balance as of ${formatDate(summary.bankAsOf * 1000)}.`
                  : `Bank balance estimated from records: funds received (${formatMoney(received)}) plus Zelle, check and cash donations (${formatMoney(offline)}), less expenses.`}{' '}
                Private expenses are not shown.
              </p>
            </section>

            <section aria-labelledby="activity" className="flex flex-col gap-3">
              <h2 id="activity" className="text-section text-foreground">
                Recent activity
              </h2>
              <SegmentedControl
                aria-label="Activity"
                value={tab}
                onValueChange={setTab}
                // 44pt rows for touch; the mock's 24px segments are too small to tap.
                className="flex w-full [&>button]:h-10 [&>button]:flex-1 [&>button]:justify-center"
                options={[
                  { value: 'contributions', label: 'Contributions' },
                  { value: 'donations', label: 'Donations' },
                  { value: 'expenses', label: 'Expenses' }
                ]}
              />
              {tab === 'contributions' && <MonthPayments names={names} />}
              {tab === 'donations' &&
                (donations.length ? (
                  <CappedMoneyList
                    label="Donations"
                    items={donations}
                    row={(d) => (
                      <MoneyRow
                        key={d.id}
                        name={
                          d.is_anonymous
                            ? 'Anonymous'
                            : d.donors?.organization_name ||
                              d.donors?.full_name ||
                              'Donor'
                        }
                        secondary={[
                          purposeTitleMap[d.purpose ?? ''] ?? 'Donation',
                          d.payment_method && paidWith(d.payment_method)
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        date={formatDate(d.donation_date)}
                        amount={formatMoney(d.donation_amount)}
                      />
                    )}
                  />
                ) : (
                  <StatePanel
                    icon={Gift}
                    title="No donations yet"
                    className="py-6"
                  >
                    Completed gifts from members and the public appear here.
                  </StatePanel>
                ))}
              {tab === 'expenses' &&
                (expenses.length ? (
                  <CappedMoneyList
                    label="Expenses"
                    items={expenses}
                    row={(e) => (
                      <MoneyRow
                        key={e.id}
                        name={e.payee || e.category}
                        secondary={[e.category, e.description]
                          .filter(Boolean)
                          .join(' · ')}
                        date={formatDate(e.date)}
                        amount={formatMoney(-e.amount)}
                      />
                    )}
                  />
                ) : (
                  <StatePanel
                    icon={Receipt}
                    title="No expenses recorded yet"
                    className="py-6"
                  >
                    Public expenses recorded by the board appear here.
                  </StatePanel>
                ))}
            </section>
          </>
        );
      }}
    </Loaded>
  );
}
