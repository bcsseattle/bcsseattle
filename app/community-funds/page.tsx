import { Expenses } from '@/components/expenses';
import { columns } from '@/components/payments/columns';
import RecentDonations from '@/components/recent-donations';
import RecentFunds from '@/components/recent-funds';
import {
  Card,
  CardContent,
  CardDescription,
  // CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { getPriceString } from '@/utils/helpers';
import {
  getBankBalance,
  getDonations,
  getStripeAvailableBalance,
  // getStripeCustomers,
  getStripePayments,
  getStripeRecentTransactions
} from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Loading from '../loading';

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

  if (!member?.isApproved) {
    return redirect(`/members/${member?.id}/pending`);
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  const { data: funds } = await supabase
    .from('funds')
    .select('*')
    .neq('status', 'cancelled')
    .neq('status', 'failed')
    .neq('is_private', true)
    .order('created_at', { ascending: false });

  const { data: donations } = await getDonations();

  const donationsOutsideStripe = donations?.filter(
    (donation) => !Boolean(donation.stripe_payment_id)
  );

  const totalDonations = donationsOutsideStripe?.reduce(
    (acc: number, donation: any) => acc + donation.amount,
    0
  );

  const fundsInBank = funds?.reduce(
    (acc: number, fund: any) => acc + fund.amount,
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
    expenses?.reduce((acc: number, expense: any) => acc + expense.amount, 0) ??
    0;

  const totalStripeFees =
    transactions?.reduce(
      (acc: number, transaction: any) => acc + transaction.fee,
      0
    ) ?? 0;

  // Real bank balance once linked (scripts/link-bank-account.mjs); until then, estimate from records.
  const bankAmount =
    bank?.amount ?? (fundsInBank || 0) + (totalDonations || 0) - totalExpenses;
  const bankAsOf = bank
    ? `As of ${new Date(bank.asOf * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })}`
    : 'Estimated from records';

  const bankBalance = getPriceString(bankAmount);
  const expensesString = getPriceString(totalExpenses);
  const availableFunds = getPriceString(bankAmount + stripeAmount);
  const stripeBalance = getPriceString(stripeAmount);
  const stripeFeesString = getPriceString(totalStripeFees);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bankBalance}</div>
            <p className="text-xs text-muted-foreground">{bankAsOf}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-{expensesString}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Processing Fees
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-{stripeFeesString}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Funds
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableFunds}</div>
            <p className="text-xs text-muted-foreground">
              Bank + {stripeBalance} in Stripe
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="col-span-4">
        <Suspense fallback={<Loading />}>
          <RecentDonations donations={donations || []} />
        </Suspense>
      </div>
      <div className="col-span-4">
        <Suspense fallback={<Loading />}>
          <RecentFunds
            members={members as any}
            columns={columns}
            month={month}
            year={year}
          />
        </Suspense>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Administrative Expenses</CardTitle>
            <CardDescription>
              Details of administrative expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Expenses expenses={expenses || []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
