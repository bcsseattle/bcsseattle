'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { FundraiserProgress } from './fundraiser-progress';
import { FundraiserUpdates } from './fundraiser-updates';
import { Fundraiser } from '@/types';
import { isOpen } from '@/utils/giving';
import { formatDate } from '@/utils/format';
import { FormattedText } from '@/components/ui/formatted-text';

interface FundraiserDetailsProps {
  fundraiser: Fundraiser;
  isAdmin?: boolean;
  /** The donor wall, a server component rendered by the page. */
  donors: React.ReactNode;
}

export function FundraiserDetails({
  fundraiser,
  isAdmin = false,
  donors
}: FundraiserDetailsProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  useEffect(() => {
    if (success === 'true') {
      toast.success('Thank you for your donation!');
    }
  }, [success]);

  // Closed fundraisers say when they ended and offer no Donate (W22).
  const open = isOpen(fundraiser);
  const timeLeft = !fundraiser.ends_at
    ? 'No end date'
    : Date.parse(fundraiser.ends_at) < Date.now()
      ? `Ended ${formatDate(fundraiser.ends_at)}`
      : `Ends ${formatDistanceToNow(new Date(fundraiser.ends_at), { addSuffix: true })}`;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-display text-foreground">{fundraiser.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{fundraiser.category}</Badge>
              <span className="text-sm text-muted-foreground">
                {timeLeft}
              </span>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link href={`/fundraisers/admin/${fundraiser.id}/edit`}>
                Edit Fundraiser
              </Link>
            </Button>
          )}
        </div>

        {fundraiser.image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={fundraiser.image_url}
              alt={fundraiser.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <FundraiserProgress
          currentAmount={fundraiser.current_amount ?? 0}
          goalAmount={fundraiser.goal_amount}
        />

        {fundraiser.description && (
          <section className="max-w-3xl space-y-3" aria-labelledby="fundraiser-story">
            <h2 id="fundraiser-story" className="text-section text-foreground">About this fundraiser</h2>
            <FormattedText text={fundraiser.description} />
          </section>
        )}

        {open ? (
          <div className="flex justify-center">
            <Button size="lg" asChild>
              <Link href={`/fundraisers/${fundraiser.id}/donate`}>Donate Now</Link>
            </Button>
          </div>
        ) : (
          <p className="mt-0 text-center text-muted-foreground">This fundraiser has closed. Thank you to everyone who gave.</p>
        )}
      </div>

      <div className="space-y-8">
        <FundraiserUpdates fundraiserId={fundraiser.id} isAdmin={isAdmin} />
        {donors}
      </div>
    </div>
  );
}
