import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { formatMoney } from '@/utils/format';
import { createClient } from '@/utils/supabase/server';

interface FundraiserDonorsProps {
  fundraiserId: string;
}

// Server component: rendered by the page and passed into the client-side
// FundraiserDetails as a prop. Importing it from a client component made it an
// async client component, which suspends forever on client navigation (BUG-074).
export async function FundraiserDonors({ fundraiserId }: FundraiserDonorsProps) {
  const supabase = await createClient();
  const { data: donors, error } = await supabase
    .from('fundraiser_donations')
    .select('id, amount, donor_name, message, created_at, is_anonymous')
    .eq('fundraiser_id', fundraiserId)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    throw error;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donors</CardTitle>
        <CardDescription>
          People who have supported this fundraiser
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        { donors.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No donations yet. Be the first to donate!
          </p>
        ) : (
          donors.map((donor) => (
            <div key={donor.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {donor.is_anonymous ? 'Anonymous Donor' : donor.donor_name}
                </p>
                <p className="font-medium">{formatMoney((donor.amount ?? 0) * 100)}</p>
              </div>
              {donor.message && (
                <p className="text-muted-foreground">{donor.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Donated {formatDistanceToNow(new Date(donor.created_at))} ago
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
