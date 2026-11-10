'use client';

import Link from 'next/link';
import { ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Fundraiser } from '@/types';
import { formatDate, formatMoney } from '@/utils/format';

export const categoryLabel = (category?: string | null) =>
  category ? category.charAt(0).toUpperCase() + category.slice(1) : null;

/** Raised as a share of the goal, 0–100 (the website's FundraiserCard rule). */
export const percentRaised = (f: Fundraiser) => Math.min(100, ((f.current_amount ?? 0) / f.goal_amount) * 100);

/** Open for gifts: active and not past its end date (no end date means open-ended), as the web donate page checks. */
export const isOpen = (f: Fundraiser) => f.status === 'active' && !(f.ends_at && new Date(f.ends_at) < new Date());

/** The image on the Mat, never cropped (Figma 3:291). */
export function FundraiserImage({ src, className = 'h-[216px]' }: { src: string | null; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 bg-mat ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer
        <img src={src} alt="" className="size-full object-contain" />
      ) : (
        <>
          <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
          <span className="text-caption text-muted-foreground">No image</span>
        </>
      )}
    </div>
  );
}

/**
 * BCS/Fundraiser card (Figma 3:290), as the website's FundraiserCard draws it,
 * with the app's routes: the title opens the detail and Donate starts the gift.
 */
export function FundraiserCard({ fundraiser }: { fundraiser: Fundraiser }) {
  const raised = fundraiser.current_amount ?? 0;
  const progress = percentRaised(fundraiser);
  const category = categoryLabel(fundraiser.category);
  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <FundraiserImage src={fundraiser.image_url} />
      <div className="flex flex-col items-start gap-3 p-4">
        {category && <Badge tone="neutral">{category}</Badge>}
        <h3 className="text-item text-foreground">
          <Link
            href={`/give/fundraisers/view/?id=${fundraiser.id}`}
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
          <span className="text-sm font-semibold text-foreground">{formatMoney(raised * 100, { whole: true })} raised</span>
          <span className="text-caption text-muted-foreground">
            of {formatMoney(fundraiser.goal_amount * 100, { whole: true })}
          </span>
        </div>
        {fundraiser.ends_at && (
          <span className="text-caption text-muted-foreground">Ends {formatDate(fundraiser.ends_at)}</span>
        )}
        {isOpen(fundraiser) && (
          <Link
            href={`/give/fundraisers/donate/?id=${fundraiser.id}`}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'relative z-10 w-full' })}
          >
            Donate<span className="sr-only"> to {fundraiser.title}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
