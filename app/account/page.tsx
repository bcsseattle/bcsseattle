import CustomerPortalForm from '@/components/ui/AccountForms/CustomerPortalForm';
import DonationReceiptForm from '@/components/ui/AccountForms/DonationReceiptForm';
import EmailForm from '@/components/ui/AccountForms/EmailForm';
import NameForm from '@/components/ui/AccountForms/NameForm';
import ReceiptForm from '@/components/ui/AccountForms/ReceiptForm';
import { Donation } from '@/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Account(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams?.redirectTo ?? 'account';

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: userDetails } = await supabase
    .from('users')
    .select('*')
    .single();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.log(error);
  }

  if (!user) {
    return redirect(`/signin?redirectTo=${redirectTo}`);
  }

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  if (!member) {
    return redirect('/register');
  }

  if (member?.status === 'inactive') {
    return redirect('/register');
  }

  const { data: donor } = await supabase
    .from('donors')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  let donations: Donation[] = [];
  if (donor) {
    const { data } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', donor?.id);
    donations = data ? data : [];
  }

  return (
    <section className="my-8">
      <div className="space-y-4">
        {donations && donations.length > 0 && (
          <DonationReceiptForm donations={donations} />
        )}
        <ReceiptForm member={member} />
        <CustomerPortalForm subscription={subscription} />
        <NameForm userName={userDetails?.full_name ?? ''} />
        <EmailForm userEmail={user.email} />
      </div>
    </section>
  );
}
