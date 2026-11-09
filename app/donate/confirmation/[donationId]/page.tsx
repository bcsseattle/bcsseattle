import Invoice from '@/components/donations/invoice';
import { createClient } from '@/utils/supabase/server';
// Receipts are opened by guests too: donations/donors are read by id with the service role.
import { supabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';

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

  // A receipt is only issued for money received (BUG-042). Donors land here
  // straight from Stripe, often a moment before the webhook confirms payment.
  if (donation.donation_status !== 'completed') {
    const failed = donation.donation_status === 'failed';
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4">
        {!failed && <meta httpEquiv="refresh" content="5" />}
        <h1 className="text-2xl font-bold">
          {failed ? 'Your payment did not go through' : 'Thank you! We are confirming your payment'}
        </h1>
        <p className="text-muted-foreground">
          {failed
            ? 'No money was taken. Please try donating again or contact us.'
            : 'Your receipt will appear here as soon as the payment is confirmed. Bank transfers can take a few days; we will email your receipt.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Invoice organization={organization} donation={donation} donor={donor} />
    </div>
  );
}
