import { getSession } from '@/utils/auth-helpers/server';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { FundraiserUpdateForm } from '@/components/fundraisers/admin/fundraiser-update-form';

interface PageProps {
  params: {
    id: string;
  };
}

async function getFundraiser(id: string) {
  const supabase = await createClient();
  const { data: fundraiser, error } = await supabase
    .from('fundraisers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !fundraiser) {
    console.error('Error fetching fundraiser:', error);
    return null;
  }

  // Transform database fields to match form fields
  return fundraiser;
}

export default async function EditFundraiserPage({ params }: PageProps) {
  const session = await getSession();
  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  if (!isAdmin) {
    redirect('/fundraisers');
  }

  const { id } = await params;
  const fundraiser = await getFundraiser(id);

  if (!fundraiser) {
    notFound();
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Fundraiser</h1>
        <p className="text-muted-foreground">
          Update the details of your fundraising campaign.
        </p>
      </div>

      <div className="space-y-8">
        <FundraiserUpdateForm fundraiser={fundraiser} />
      </div>
    </div>
  );
}
