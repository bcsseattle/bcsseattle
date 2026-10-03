'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface FundraiserUpdatesProps {
  fundraiserId: string;
  isAdmin?: boolean;
}

interface Update {
  id: string;
  content: string;
  created_at: string;
}

export function FundraiserUpdates({
  fundraiserId,
  isAdmin = false
}: FundraiserUpdatesProps) {
  const router = useRouter();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUpdates() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('fundraiser_updates')
          .select('id, content, created_at')
          .eq('fundraiser_id', fundraiserId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setUpdates(data);
      } catch (error) {
        console.error('Error fetching updates:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUpdates();
  }, [fundraiserId]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Updates</CardTitle>
          <CardDescription>
            Latest updates about this fundraiser
          </CardDescription>
        </div>
        {isAdmin && (
          <Button
            onClick={() =>
              router.push(`/fundraisers/${fundraiserId}/updates/new`)
            }
          >
            Add Update
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading updates...</p>
        ) : updates.length === 0 ? (
          <p className="text-center text-muted-foreground">No updates yet.</p>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="space-y-1">
              <p>{update.content}</p>
              <p className="text-sm text-muted-foreground">
                Posted {formatDistanceToNow(new Date(update.created_at))} ago
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
