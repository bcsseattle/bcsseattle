'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Fundraiser } from '@/types';
import { formatDate, formatMoney } from '@/utils/format';

interface FundraiserCardProps {
  fundraiser: Fundraiser;
}

/**
 * BCS/Fundraiser card (Figma 3:290). The image sits on the mat and is never
 * cropped; the category is a neutral badge; progress is ink. The title link
 * covers the card, and Donate is its own link above it, so no control is
 * nested inside another (BUG-066).
 */
export function FundraiserCard({ fundraiser }: FundraiserCardProps) {
  const raised = fundraiser.current_amount ?? 0;
  const progress = Math.min(100, (raised / fundraiser.goal_amount) * 100);
  const category = fundraiser.category
    ? fundraiser.category.charAt(0).toUpperCase() + fundraiser.category.slice(1)
    : null;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="relative flex h-[216px] flex-col items-center justify-center gap-1 bg-mat">
        {fundraiser.image_url ? (
          <Image src={fundraiser.image_url} alt="" fill className="object-contain" />
        ) : (
          <>
            <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
            <span className="text-caption text-muted-foreground">No image</span>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 p-4">
        {category && <Badge tone="neutral">{category}</Badge>}
        <h3 className="text-item text-foreground">
          <Link
            href={`/fundraisers/${fundraiser.id}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {fundraiser.title}
          </Link>
        </h3>
        {fundraiser.description && (
          <p className="mt-0 line-clamp-2 text-sm text-muted-foreground">{fundraiser.description}</p>
        )}
        <Progress value={progress} aria-label={`${Math.round(progress)}% of the goal raised`} />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {formatMoney(raised * 100, { whole: true })} raised
          </span>
          <span className="text-caption text-muted-foreground">
            of {formatMoney(fundraiser.goal_amount * 100, { whole: true })}
          </span>
        </div>
        {fundraiser.ends_at && (
          <span className="text-caption text-muted-foreground">Ends {formatDate(fundraiser.ends_at)}</span>
        )}
        <Link
          href={`/fundraisers/${fundraiser.id}/donate`}
          className={buttonVariants({ variant: 'outline', className: 'relative z-10 mt-auto w-full' })}
        >
          Donate<span className="sr-only"> to {fundraiser.title}</span>
        </Link>
      </div>
    </article>
  );
}
