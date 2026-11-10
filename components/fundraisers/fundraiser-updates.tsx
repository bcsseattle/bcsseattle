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
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { Loading, SkeletonRows } from '@/components/ui/skeleton';

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
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  async function postUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setPostError('');
    const res = await fetch(`/api/fundraisers/${fundraiserId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setUpdates((prev) => [body, ...prev]);
      setContent('');
    } else {
      setPostError(body.error ?? 'Could not post the update.');
    }
    setPosting(false);
  }

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
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <form onSubmit={postUpdate} className="space-y-2">
            <Textarea
              aria-label="New update"
              placeholder="Share news about this fundraiser"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            {postError && <p className="text-sm text-destructive">{postError}</p>}
            <Button type="submit" disabled={posting || !content.trim()}>
              {posting ? 'Posting…' : 'Add Update'}
            </Button>
          </form>
        )}
        {isLoading ? (
          <Loading label="Loading updates…">
            <SkeletonRows count={2} className="px-0" />
          </Loading>
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
