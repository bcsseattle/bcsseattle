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
import { FundraiserDonors } from './fundraiser-donors';
import { Fundraiser } from '@/types';

interface FundraiserDetailsProps {
  fundraiser: Fundraiser;
  isAdmin?: boolean;
}

export function FundraiserDetails({
  fundraiser,
  isAdmin = false
}: FundraiserDetailsProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  useEffect(() => {
    if (success === 'true') {
      toast.success('Thank you for your donation!');
    }
  }, [success]);

  const timeLeft = fundraiser.ends_at 
    ? formatDistanceToNow(new Date(fundraiser.ends_at), { addSuffix: true })
    : 'No end date';

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{fundraiser.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{fundraiser.category}</Badge>
              <span className="text-sm text-muted-foreground">
                Ends {timeLeft}
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

        <div className="prose max-w-none">
          <p>{fundraiser.description}</p>
        </div>

        <div className="flex justify-center">
          <Button size="lg" asChild>
            <Link href={`/fundraisers/${fundraiser.id}/donate`}>
              Donate Now
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <FundraiserUpdates fundraiserId={fundraiser.id} isAdmin={isAdmin} />
        <FundraiserDonors fundraiserId={fundraiser.id} />
      </div>
    </div>
  );
}
