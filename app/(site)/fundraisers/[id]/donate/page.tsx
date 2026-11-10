import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DonationForm } from '@/components/fundraisers/donation-form';
import { getSession } from '@/utils/auth-helpers/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';

interface PageProps {
  params: Promise<{ id: string }>;
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
  const { id } = await params;
  // Check for active session first
  const session = await getSession();
  if (!session) {
    // Redirect to sign in, but remember where they were trying to go
    redirect(`/signin?redirectTo=/fundraisers/${id}/donate`);
  }

  const fundraiser = await getFundraiser(id);

  if (!fundraiser) {
    notFound();
  }

  // If fundraiser has ended or is not active, redirect to main page.
  // No end date means open-ended (BUG-038).
  if (fundraiser.status !== 'active' || (fundraiser.ends_at && new Date(fundraiser.ends_at) < new Date())) {
    return (
      <div className="max-w-2xl pb-8 pt-8 lg:pt-16">
        <div className="rounded-lg border bg-card p-8 text-center">
          <h1 className="mb-2 text-screen text-foreground">
            This fundraiser is no longer accepting donations
          </h1>
          <p className="text-muted-foreground mb-6">
            The fundraiser has ended or is not currently active.
          </p>
          <Button variant="outline" asChild>
            <Link href="/fundraisers">View Other Fundraisers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl pb-8 pt-8 lg:pt-16">
      <BreadcrumbName id={fundraiser.id} name={fundraiser.title} />
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-display text-foreground">Make a Donation</h1>
        <p className="mt-0 text-sm text-muted-foreground">
          Support {fundraiser.title}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <DonationForm fundraiser={fundraiser} />
      </div>
    </div>
  );
}
