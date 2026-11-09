import CustomerPortalForm from '@/components/ui/AccountForms/CustomerPortalForm';
import DonationReceiptForm from '@/components/ui/AccountForms/DonationReceiptForm';
import EmailForm from '@/components/ui/AccountForms/EmailForm';
import NameForm from '@/components/ui/AccountForms/NameForm';
import ReceiptForm from '@/components/ui/AccountForms/ReceiptForm';
import { Donation } from '@/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { MemberStatusBadge } from '@/components/portal/member-row';
import { PageHeader } from '@/components/portal/page-header';
import { SignOutButton } from '@/components/portal/sign-out-button';
import { PersonRow } from '@/components/ui/person-row';

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

  const name = userDetails?.full_name || member.fullName || user.email || 'Member';
  const group = (title: string, children: React.ReactNode) => (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-overline uppercase text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );

  // Account, after the mobile Account screen (Figma 19:2559): who you are, then
  // the Membership and Profile groups, then Sign out. The forms are unchanged.
  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <PageHeader title="My account" />
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <PersonRow className="flex-1" name={name} secondary={user.email} />
        <MemberStatusBadge status={member.status} />
      </div>
      {group(
        'Membership',
        <>
          {subscriptions?.map((sub) => <CustomerPortalForm key={sub.id} subscription={sub} />)}
          <ReceiptForm member={member} />
          {donations.length > 0 && <DonationReceiptForm donations={donations} />}
        </>
      )}
      {group(
        'Profile',
        <>
          <NameForm userName={userDetails?.full_name ?? ''} />
          <EmailForm userEmail={user.email ?? ''} />
        </>
      )}
      <SignOutButton />
    </div>
  );
}
