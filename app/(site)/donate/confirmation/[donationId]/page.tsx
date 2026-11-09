import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
// Receipts are opened by guests too: donations/donors are read by id with the service role.
import { supabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';

import { ActionBar } from '@/components/ui/action-bar';
import { buttonVariants } from '@/components/ui/button';
import { ResultHeader } from '@/components/ui/result-header';
import { formatDate, formatMoney } from '@/utils/format';
import { purposeTitleMap } from '@/utils/helpers';

const PAID_WITH: Record<string, string> = {
  card: 'Card',
  us_bank_account: 'Bank transfer',
  zelle: 'Zelle',
  check: 'Check',
  cash: 'Cash'
};

const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

/** Receipt rows (BCS/List row 13:2112 in a card-filled group). */
function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="overflow-hidden rounded-lg border bg-card text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="flex h-13 items-center gap-3 border-b pl-4 pr-3 last:border-b-0">
          <dt className="min-w-0 flex-1 text-foreground">{term}</dt>
          <dd className="shrink-0 text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function DonationConfirmation(props: {
  params: Promise<{ donationId: string }>;
}) {
  const params = await props.params;
  const { donationId } = params || {};
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from('organization')
    .select('*')
    .maybeSingle();

  const { data: donation } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('id', donationId)
    .maybeSingle();

  if (!donation) {
    return redirect('/donate');
  }
  const { data: donor } = await supabaseAdmin
    .from('donors')
    .select('*')
    .eq('id', donation?.donor_id)
    .maybeSingle();

  if (!donor) {
    return redirect('/donate');
  }

  if (!organization) {
    return redirect('/donate');
  }

  const amount = formatMoney(donation.donation_amount);
  const purpose = sentenceCase(purposeTitleMap[donation.purpose ?? ''] ?? 'General purpose');
  const paidWith = PAID_WITH[donation.payment_method ?? ''] ?? 'Other';
  const firstName = donor.full_name?.trim().split(/\s+/)[0];

  // A receipt is only issued for money received (BUG-042). Donors land here
  // straight from Stripe, often a moment before the webhook confirms payment.
  if (donation.donation_status !== 'completed') {
    const failed = donation.donation_status === 'failed';
    if (failed) {
      return (
        <div className="mx-auto max-w-xl py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Your payment did not go through</h1>
          <p className="text-muted-foreground">No money was taken. Please try donating again or contact us.</p>
        </div>
      );
    }
    // Gift pending (Figma 24:2843); refreshes until the webhook confirms it.
    return (
      <div className="mx-auto flex max-w-[480px] flex-col gap-6 pt-12">
        <meta httpEquiv="refresh" content="5" />
        <ResultHeader tone="pending" title="We’re confirming your payment">
          {firstName ? `Thank you, ${firstName}. ` : 'Thank you. '}
          Bank transfers can take a few days; we’ll email your receipt as soon as the money arrives.
        </ResultHeader>
        <Rows
          rows={[
            ['Amount', amount],
            ['Purpose', purpose],
            ['Paid with', paidWith],
            ['Status', 'Confirming']
          ]}
        />
        <p className="mt-0 text-caption text-muted-foreground">
          No receipt is issued until the payment is received. If the transfer fails, no money is taken and we’ll let
          you know.
        </p>
        <ActionBar>
          <Link href="/" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            Done
          </Link>
        </ActionBar>
      </div>
    );
  }

  // Gift complete (Figma 24:2778): the receipt, by PDF and by email.
  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-6 pt-12">
      <ResultHeader tone="success" title={firstName ? `Thank you, ${firstName}` : 'Thank you'}>
        Your gift of {amount} to {purpose} is complete.
      </ResultHeader>
      <div className="flex flex-col gap-3">
        <Rows
          rows={[
            ['Amount', amount],
            ['Purpose', purpose],
            ['Paid with', paidWith],
            ['Date', formatDate(donation.donation_date)]
          ]}
        />
        <Link
          href={`/donate/confirmation/${donation.id}/pdf`}
          className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
        >
          Download receipt (PDF)
        </Link>
      </div>
      {/* The mock says "We emailed your receipt"; the app sends no receipt email, so it doesn't claim one. */}
      <p className="mt-0 text-caption text-muted-foreground">
        Save the PDF for your records. {organization.name ?? 'BCS Seattle'} is a 501(c)(3) nonprofit, EIN{' '}
        {organization.ein ?? '99-2495973'}.{' '}
        {donation.goods_or_services_provided
          ? `Goods or services provided: ${donation.goods_services_description ?? 'see the receipt'}.`
          : 'No goods or services were provided in exchange for this gift.'}
      </p>
      <ActionBar>
        <Link href="/" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Done
        </Link>
      </ActionBar>
    </div>
  );
}
