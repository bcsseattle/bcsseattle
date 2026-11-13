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
import { useData } from '~/lib/use-data';

type Summary = FundsSummary;

/**
 * Community funds (Figma 19:2389), the same data as the website's
 * /community-funds. Approved active members only.
 */
export default function FundsTab() {
  return (
    <>
      <AppHeader
        title="Community funds"
        subtitle="Where BCS Seattle’s money is and where it goes."
      />
      <div className="flex flex-col gap-6 px-4 pb-6 pt-2">
        <MembersOnly>{() => <Funds />}</MembersOnly>
      </div>
    </>
  );
}

function Funds() {
  const [tab, setTab] = useState('contributions');
  const state = useData(async () => {
    const [funds, expenses, donations, members, summary] = await Promise.all([
      must(
        supabase
          .from('funds')
          .select('amount')
          .neq('status', 'cancelled')
          .neq('status', 'failed')
          .neq('is_private', true)
      ),
      must(
        supabase
          .from('expenses')
          .select('*')
          .eq('is_private', false)
          .order('date', { ascending: false })
      ),
      must(
        supabase
          .from('donations')
          .select(
            'id, donation_amount, donation_date, payment_method, purpose, is_anonymous, donors(full_name, organization_name)'
          )
          .eq('is_private', false)
          .eq('donation_status', 'completed')
          .order('donation_date', { ascending: false })
      ),
      must(
        supabase
          .from('members')
          .select('fullName, customers(stripe_customer_id)')
      ),
      // Not fatal: without it the screen shows the estimate, as the website does before a bank is linked.
      api<Summary>('/api/app/community-funds/summary').catch(() => null)
    ]);
    return {
      funds: funds ?? [],
      expenses: expenses ?? [],
      donations: donations ?? [],
      members: members ?? [],
      summary
    };
  });

  return (
    <Loaded state={state}>
      {({ funds, expenses, donations, members, summary }) => {
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
                value={formatMoney(bank + stripe)}
                note={`Bank + ${formatMoney(stripe)} in Stripe`}
              />
              <ListGroup>
                <ListRow label="Bank balance" value={formatMoney(bank)} />
                <ListRow label="In Stripe" value={formatMoney(stripe)} />
                <ListRow label="Expenses" value={formatMoney(-spent)} />
                {summary && <ListRow label="Processing fees" value={formatMoney(-summary.stripeFees)} />}
              </ListGroup>
              <p className="px-1 text-caption text-muted-foreground">
                {summary?.bankAsOf
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
