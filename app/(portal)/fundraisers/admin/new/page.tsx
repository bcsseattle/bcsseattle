import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FundraiserForm } from '@/components/fundraisers/admin/fundraiser-form';
import { PageHeader } from '@/components/portal/page-header';

export default async function NewFundraiserPage() {

   const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const {
      data: { user }
    } = await supabase.auth.getUser();
  
    if (!user) {
      return redirect('/signin?redirectTo=/admin/members');
    }
  
    // Check if user is admin using the is_admin column
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
  
    if (!userProfile || !userProfile.is_admin) {
      redirect('/fundraisers');
    }


  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Create New Fundraiser"
        description="Set up a new fundraising campaign for your cause."
      />

      <FundraiserForm />
    </div>
  );
}
