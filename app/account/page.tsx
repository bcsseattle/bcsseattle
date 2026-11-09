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

  if (!user) {
    return redirect(`/signin?redirectTo=${redirectTo}`);
  }

  // Run user-related queries in parallel for better performance
  const [
    { data: userDetails },
    { data: subscriptions, error: subscriptionError },
    { data: member }
  ] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('*, prices(*, products(*))')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created', { ascending: false }),
    supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  if (subscriptionError) {
    console.error('Subscription query error:', subscriptionError);
  }

  if (!member) {
    return redirect('/register');
  }

  if (member.status === 'inactive') {
    return redirect('/register');
  }

  // Fetch donor and donations data in parallel if needed
  const { data: donor } = await supabase
    .from('donors')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let donations: Donation[] = [];
  if (donor?.id) {
    const { data: donationData, error: donationError } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', donor.id)
      .order('donation_date', { ascending: false }); // Order by donation_date (most recent first)
    
    if (donationError) {
      console.error('Donations query error:', donationError);
    } else {
      donations = donationData || [];
    }
  }

  return (
    <section className="my-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
        <div className="space-y-6">
          {donations.length > 0 && (
            <DonationReceiptForm donations={donations} />
          )}
          <ReceiptForm member={member} />
          {subscriptions && subscriptions.length > 0 && (
            <div className="space-y-4">
              {subscriptions.length > 1 && (
                <h2 className="text-lg font-semibold">Active Subscriptions</h2>
              )}
              {subscriptions.map((sub, index) => (
                <div key={sub.id} className="space-y-2">
                  {subscriptions.length > 1 && (
                    <h3 className="text-md font-medium text-gray-700">
                      Subscription {index + 1}
                    </h3>
                  )}
                  <CustomerPortalForm subscription={sub} />
                </div>
              ))}
            </div>
          )}
          <NameForm userName={userDetails?.full_name ?? ''} />
          <EmailForm userEmail={user.email ?? ''} />
        </div>
      </div>
    </section>
  );
}
