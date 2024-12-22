import Invoice from '@/components/donations/invoice';
import { createClient } from '@/utils/supabase/server';
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

  const { data: donation } = await supabase
    .from('donations')
    .select('*')
    .eq('id', donationId)
    .maybeSingle();

  if (!donation) {
    return redirect('/donate');
  }
  const { data: donor } = await supabase
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

  return (
    <div>
      <Invoice organization={organization} donation={donation} donor={donor} />
    </div>
  );
}
