import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FundraiserForm } from '@/components/fundraisers/admin/fundraiser-form';

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
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Fundraiser</h1>
        <p className="text-muted-foreground">
          Set up a new fundraising campaign for your cause.
        </p>
      </div>

      <div className="space-y-8">
        <FundraiserForm />
      </div>
    </div>
  );
}
