'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { MoneyRow } from '@/components/portal/money-row';
import { StatePanel } from '@/components/ui/state-panel';
import { formatDate, formatMoney } from '@/utils/format';
import { Loaded } from '~/components/screen';
import { CappedMoneyList } from '~/components/home/capped-money-list';
import { api } from '~/lib/api';
import { useData } from '~/lib/use-data';

type Payment = {
  id: string;
  customer: string;
  amount: number;
  created: number;
  type: string;
};

// The website's month picker offers January 2024 up to this month (components/recent-funds.tsx).
const FIRST = { month: 1, year: 2024 };
const monthName = (m: { month: number; year: number }) =>
  new Date(m.year, m.month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });

/**
 * One month's successful Stripe payments, as the website's "Recent
 * contributions" lists them, with a month switcher. `names` maps a Stripe
 * customer to a member's name; `customer` narrows the list to one member.
 */
export function MonthPayments({
  names,
  customer
}: {
  names: Map<string, string>;
  customer?: string | null;
}) {
  const now = new Date();
  const latest = { month: now.getMonth() + 1, year: now.getFullYear() };
  const [at, setAt] = useState(latest);
  const step = (by: number) =>
    setAt(({ month, year }) => {
      const d = new Date(year, month - 1 + by, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });
  const isFirst = at.year === FIRST.year && at.month === FIRST.month;
  const isLatest = at.year === latest.year && at.month === latest.month;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={isFirst}
          onClick={() => step(-1)}
          className="flex size-11 items-center justify-center rounded-md text-accent hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <p aria-live="polite" className="text-sm font-medium text-foreground">
          {monthName(at)}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={isLatest}
          onClick={() => step(1)}
          className="flex size-11 items-center justify-center rounded-md text-accent hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>
      {/* Keyed by month, so a new month starts from a skeleton rather than showing the last one's rows. */}
      <MonthList
        key={`${at.year}-${at.month}`}
        at={at}
        names={names}
        customer={customer}
      />
    </div>
  );
}

function MonthList({
  at,
  names,
  customer
}: {
  at: { month: number; year: number };
  names: Map<string, string>;
  customer?: string | null;
}) {
  const payments = useData(() =>
    api<{ payments: Payment[] }>(
      `/api/app/community-funds/payments?month=${at.month}&year=${at.year}`
    )
  );
  return (
    <Loaded state={payments}>
      {({ payments: all }) => {
        const list =
          customer === undefined
            ? all
            : all.filter((p) => p.customer === customer);
        return list.length ? (
          <CappedMoneyList
            label={`Payments in ${monthName(at)}`}
            items={list}
            row={(p) => (
              <MoneyRow
                key={p.id}
                name={names.get(p.customer) ?? 'Not in the directory'}
                secondary={p.type}
                date={formatDate(p.created * 1000)}
                amount={formatMoney(p.amount)}
              />
            )}
          />
        ) : (
          <StatePanel
            icon={Receipt}
            title="No payments this month"
            className="py-6"
          >
            Nothing was received through Stripe in {monthName(at)}.
          </StatePanel>
        );
      }}
    </Loaded>
  );
}
