import { Expenses } from '@/components/expenses';
import { columns } from '@/components/payments/columns';
import RecentDonations from '@/components/recent-donations';
import RecentFunds from '@/components/recent-funds';
import { formatDate, formatMoney } from '@/utils/format';
import {
  getBankBalance,
  getDonations,
  getStripeAvailableBalance,
  getStripeRecentTransactions
} from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/portal/page-header';
import { Panel } from '@/components/portal/panel';
import { StatTile } from '@/components/ui/stat-tile';
import { Loading, SkeletonRows } from '@/components/ui/skeleton';

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function CommunityFunds(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const month = searchParams?.month ?? (new Date().getMonth() + 1).toString();
  const year = searchParams?.year ?? new Date().getFullYear().toString();

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  const { data: members } = await supabase
    .from('members')
    .select('*, customers(*)');

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  if (member?.status === 'inactive') {
    return redirect('/register');
  }

  // Signed in but never registered: there's no member to show a status for (BUG-056).
  if (!member) {
    return redirect('/register');
  }

  if (!member?.isApproved) {
    return redirect(`/members/${member?.id}/pending`);
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_private', false)
    .order('date', { ascending: false });

  const { data: funds } = await supabase
    .from('funds')
    .select('*')
    .neq('status', 'cancelled')
    .neq('status', 'failed')
    .neq('is_private', true)
    .order('created_at', { ascending: false });

  const { data: donations } = await getDonations();

  // Money received outside Stripe: completed Zelle, check, cash or external
  // donations. Card and bank donations go through Stripe, and pending ones
  // (abandoned checkouts, unconfirmed pledges) aren't money yet (BUG-040).
  const donationsOutsideStripe = donations?.filter(
    (donation) =>
      donation.donation_status === 'completed' &&
      !['card', 'us_bank_account'].includes(donation.payment_method ?? '')
  );

  const totalDonations = donationsOutsideStripe?.reduce(
    (acc: number, donation) => acc + Number(donation.donation_amount), // the column is donation_amount, in cents
    0
  );

  const fundsInBank = funds?.reduce(
    (acc: number, fund) => acc + fund.amount,
    0
  );

  const [{ available, pending }, transactions, bank] = await Promise.all([
    getStripeAvailableBalance(),
    getStripeRecentTransactions(),
    getBankBalance()
  ]);

  const stripeAmount =
    (available?.[0]?.amount ?? 0) + (pending?.[0]?.amount ?? 0);
  const totalExpenses =
    expenses?.reduce((acc: number, expense) => acc + expense.amount, 0) ??
    0;

  const totalStripeFees =
    transactions?.reduce(
      (acc: number, transaction) => acc + transaction.fee,
      0
    ) ?? 0;

  // Real bank balance once linked (scripts/link-bank-account.mjs); until then, estimate from records.
  const bankAmount =
    bank?.amount ?? (fundsInBank || 0) + (totalDonations || 0) - totalExpenses;
  const bankAsOf = bank ? `As of ${formatDate(bank.asOf * 1000)}` : 'Estimated from records';

  // Community funds (Figma 12:1281): the four totals, then contributions,
  // donations and public expenses in panels. The data and the tables'
  // filters and paging are unchanged.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Community funds"
        description="Where BCS Seattle’s money is and where it goes. Shared with approved members; private expenses are not shown."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Bank balance" value={formatMoney(bankAmount)} note={bankAsOf} />
        <StatTile label="Expenses" value={formatMoney(-totalExpenses)} note="Public expenses" />
        <StatTile label="Processing fees" value={formatMoney(-totalStripeFees)} note="Stripe fees" />
        <StatTile
          label="Available funds"
          value={formatMoney(bankAmount + stripeAmount)}
          note={`Bank + ${formatMoney(stripeAmount)} in Stripe`}
        />
      </div>
      <Panel title="Recent contributions" subtitle="Member contributions">
        <div className="px-4 pb-2">
          <Suspense fallback={<Loading><SkeletonRows className="px-0" /></Loading>}>
            <RecentFunds members={members ?? []} columns={columns} month={month} year={year} showTitle={false} />
          </Suspense>
        </div>
      </Panel>
      <Panel title="Recent donations" subtitle="Completed gifts from members and the public">
        <Suspense fallback={<Loading><SkeletonRows /></Loading>}>
          {/* Completed gifts only, as the subtitle says and the app shows (W23). */}
          <RecentDonations donations={(donations ?? []).filter((d) => d.donation_status === 'completed')} showTitle={false} />
        </Suspense>
      </Panel>
      <Panel title="Administrative expenses" subtitle="Public expenses recorded by the board">
        <Expenses expenses={expenses || []} />
      </Panel>
    </div>
  );
}
