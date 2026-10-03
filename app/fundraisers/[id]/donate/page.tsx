import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DonationForm } from '@/components/fundraisers/donation-form';
import { getSession } from '@/utils/auth-helpers/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
    .eq('status', 'active')
    .single();

  if (error || !fundraiser) {
    console.error('Error fetching fundraiser:', error);
    return null;
  }

  return fundraiser;
}

export default async function DonatePage({ params }: PageProps) {
  // Check for active session first
  const session = await getSession();
  if (!session) {
    // Redirect to sign in, but remember where they were trying to go
    redirect(`/signin?redirectTo=/fundraisers/${params.id}/donate`);
  }

  const { id } = await params;
  const fundraiser = await getFundraiser(id);

  if (!fundraiser) {
    notFound();
  }

  // If fundraiser has ended or is not active, redirect to main page
  if (fundraiser.status !== 'active' || new Date(fundraiser.ends_at!) < new Date()) {
    return (
      <div className="container max-w-2xl py-10">
        <div className="rounded-lg border p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">
            This fundraiser is no longer accepting donations
          </h1>
          <p className="text-muted-foreground mb-6">
            The fundraiser has ended or is not currently active.
          </p>
          <Button asChild>
            <Link href="/fundraisers">View Other Fundraisers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Make a Donation</h1>
        <p className="text-muted-foreground">
          Support {fundraiser.title}
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <DonationForm fundraiser={fundraiser} />
      </div>
    </div>
  );
}
