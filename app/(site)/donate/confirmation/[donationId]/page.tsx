import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
// Receipts are opened by guests too: donations/donors are read by id with the service role.
import { supabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';

import { ReceiptRows } from '@/components/donations/gift-rows';
import { ActionBar } from '@/components/ui/action-bar';
import { buttonVariants } from '@/components/ui/button';
import { ResultHeader } from '@/components/ui/result-header';
import { formatDate, formatMoney } from '@/utils/format';
import { paidWith } from '@/utils/giving';
import { purposeTitleMap } from '@/utils/helpers';

const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

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
          {donation.payment_method === 'us_bank_account'
            ? 'Bank transfers can take a few days. This page updates on its own, and your receipt will be here once the money arrives.'
            : 'This usually takes a moment. This page updates on its own, and your receipt will be here once the payment is through.'}
        </ResultHeader>
        <ReceiptRows
          rows={[
            ['Amount', amount],
            ['Purpose', purpose],
            ['Paid with', paidWith(donation.payment_method)],
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
        <ReceiptRows
          rows={[
            ['Amount', amount],
            ['Purpose', purpose],
            ['Paid with', paidWith(donation.payment_method)],
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
