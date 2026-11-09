import { createClient } from '@/utils/supabase/server';
import { FundraiserList } from '@/components/fundraisers/fundraiser-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getSession } from '@/utils/auth-helpers/server';

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
  const [fundraisers, session] = await Promise.all([
    getFundraisers(),
    getSession()
  ]);

  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fundraisers</h1>
          <p className="text-muted-foreground">
            Support our community&apos;s causes and make a difference.
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/fundraisers/admin/new">New Fundraiser</Link>
          </Button>
        )}
      </div>

      <FundraiserList fundraisers={fundraisers} />
    </div>
  );
}
