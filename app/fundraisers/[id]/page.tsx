import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { FundraiserDetails } from '@/components/fundraisers/fundraiser-details';
import { getSession } from '@/utils/auth-helpers/server';

interface PageProps {
  params: {
    id: string;
  };
}

async function getFundraiser(id: string) {
  const supabase = await createClient();
  console.log("753940a1-add6-4ec6-a5fe-b1957d7a7ec0", id)
  const { data: fundraiser, error } = await supabase
    .from('fundraisers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !fundraiser) {
    console.error('Error fetching fundraiser:', error);
    return null;
  }

  console.log(error)
  return fundraiser;
}

async function getAdmin() {
  const supabase = await createClient();
  // Check if user is authenticated and is admin
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check if user is admin using the is_admin column
  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  return userProfile?.is_admin || false;
}

export default async function FundraiserPage({ params }: PageProps) {

    const { id } = await params;

  const [isAdmin, fundraiser, session] = await Promise.all([
    getAdmin(),
    getFundraiser(id),
    getSession()
  ]);

  if (!fundraiser) {
    notFound();
  }

  return (
    <div className="container py-10">
      <FundraiserDetails fundraiser={fundraiser} isAdmin={isAdmin} />
    </div>
  );
}
