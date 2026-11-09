import { createClient } from '@/utils/supabase/server';
import { FundraiserList } from '@/components/fundraisers/fundraiser-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';

export const dynamic = 'force-dynamic';

async function getFundraisers() {
  const supabase = await createClient();
  const { data: fundraisers, error } = await supabase
    .from('fundraisers')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching fundraisers:', error);
    return [];
  }

  return fundraisers;
}

export default async function FundraisersPage() {
  const [fundraisers, isAdmin] = await Promise.all([
    getFundraisers(),
    isCurrentUserAdmin()
  ]);

  // Fundraisers (Figma 6:301, empty state 6:534).
  return (
    <div className="flex flex-col gap-8 pb-8 pt-8 lg:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="mt-0 text-overline uppercase text-muted-foreground">Fundraisers</p>
          <h1 className="text-display text-foreground">Support a community cause</h1>
          <p className="mt-0 text-sm text-muted-foreground">
            Give to a specific need, from emergency relief to education. Every fundraiser is set up and reviewed by the
            BCS Seattle board.
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href="/fundraisers/admin/new">New Fundraiser</Link>
          </Button>
        )}
      </div>

      <FundraiserList fundraisers={fundraisers} />
    </div>
  );
}
