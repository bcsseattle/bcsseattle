import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { FundraiserUpdateForm } from '@/components/fundraisers/admin/fundraiser-update-form';
import { PageHeader } from '@/components/portal/page-header';

interface PageProps {
  params: Promise<{ id: string }>;
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
  if (!(await isCurrentUserAdmin())) {
    redirect('/fundraisers');
  }

  const { id } = await params;
  const fundraiser = await getFundraiser(id);

  if (!fundraiser) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Edit Fundraiser"
        description="Update the details of your fundraising campaign."
      />

      <FundraiserUpdateForm fundraiser={fundraiser} />
    </div>
  );
}
