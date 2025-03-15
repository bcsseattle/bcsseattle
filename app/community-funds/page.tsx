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
import {
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

  const { available, pending } = await getStripeAvailableBalance();
  const transactions = await getStripeRecentTransactions();

  const availableAmount = available?.[0]?.amount;
  const pendingAmount = pending?.[0]?.amount;
  const totalExpenses =
    expenses?.reduce((acc: number, expense: any) => acc + expense.amount, 0) ??
    0;

  const totalStripeFees =
    transactions?.reduce(
      (acc: number, transaction: any) => acc + transaction.fee,
      0
    ) ?? 0;

  const collectedAmount =
    availableAmount +
    pendingAmount +
    (fundsInBank || 0) +
    totalDonations +
    totalStripeFees;
  // availableAmount > pendingAmount ? availableAmount : pendingAmount;

  const collectedFunds = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: available?.[0].currency!,
    minimumFractionDigits: 0
  }).format(collectedAmount / 100);

  const expensesString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(totalExpenses / 100);

  const availableFunds = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: available?.[0].currency!,
    minimumFractionDigits: 0
  }).format((collectedAmount - totalStripeFees - totalExpenses) / 100);

  const stripeFeesString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(totalStripeFees / 100);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collected Funds
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
            <Suspense fallback={<Loading />}>
              <div className="text-2xl font-bold">{collectedFunds}</div>
            </Suspense>
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
