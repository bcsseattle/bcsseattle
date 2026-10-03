'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/helpers';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Fundraiser } from '@/types';

interface FundraiserCardProps {
  fundraiser: Fundraiser;
}

export function FundraiserCard({ fundraiser }: FundraiserCardProps) {
  const progress = ((fundraiser.current_amount ?? 0) / fundraiser.goal_amount) * 100;
  const timeLeft = fundraiser.ends_at 
    ? formatDistanceToNow(new Date(fundraiser.ends_at), { addSuffix: true })
    : 'No end date';

  return (
    <Card className="overflow-hidden">
      <Link href={`/fundraisers/${fundraiser.id}`}>
        {fundraiser.image_url && (
          <div className="relative h-48 w-full">
            <Image
              src={fundraiser.image_url}
              alt={fundraiser.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="line-clamp-1">{fundraiser.title}</CardTitle>
            <Badge variant="outline">{fundraiser.category}</Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {fundraiser.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-2" />
          <div className="flex justify-between text-sm">
            <span>{formatCurrency(fundraiser.current_amount)} raised</span>
            <span>{formatCurrency(fundraiser.goal_amount)} goal</span>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Ends {timeLeft}
        </CardFooter>
      </Link>
    </Card>
  );
}
