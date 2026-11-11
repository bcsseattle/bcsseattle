'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Fundraiser } from '@/types';
import { formatDate, formatMoney } from '@/utils/format';
import { categoryLabel, isOpen, percentRaised } from '@/utils/giving';

interface FundraiserCardProps {
  fundraiser: Fundraiser;
  /** Where the title goes; the website's detail page by default. */
  href?: string;
  /** Where Donate goes; the website's donate page by default. */
  donateHref?: string;
  /** Donate's button size: the app passes `lg` for a 44pt target. */
  size?: 'default' | 'lg';
}

/** The image on the mat, never cropped (Figma 3:291). `className` sets the height. */
export function FundraiserImage({ src, className = 'h-[216px]' }: { src: string | null; className?: string }) {
  return (
    <div className={`relative flex ${className} flex-col items-center justify-center gap-1 bg-mat`}>
      {src ? (
        <Image src={src} alt="" fill className="object-contain" />
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
 * BCS/Fundraiser card (Figma 3:290), for the website and the app. The image
 * sits on the mat and is never cropped; the category is a neutral badge;
 * progress is ink. The title link covers the card, and Donate is its own link
 * above it, so no control is nested inside another (BUG-066).
 */
export function FundraiserCard({ fundraiser, href, donateHref, size }: FundraiserCardProps) {
  const open = isOpen(fundraiser);
  const raised = fundraiser.current_amount ?? 0;
  const progress = percentRaised(fundraiser);
  const category = categoryLabel(fundraiser.category);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <FundraiserImage src={fundraiser.image_url} />
      <div className="flex flex-1 flex-col items-start gap-3 p-4">
        {category && <Badge tone="neutral">{category}</Badge>}
        <h3 className="text-item text-foreground">
          <Link
            href={href ?? `/fundraisers/${fundraiser.id}`}
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
          <span className="text-caption text-muted-foreground">
            {Date.parse(fundraiser.ends_at) < Date.now() ? 'Ended' : 'Ends'} {formatDate(fundraiser.ends_at)}
          </span>
        )}
        {/* No Donate once it has closed, on the website and in the app (W22). */}
        {open && (
          <Link
            href={donateHref ?? `/fundraisers/${fundraiser.id}/donate`}
            className={buttonVariants({ variant: 'outline', size, className: 'relative z-10 mt-auto w-full' })}
          >
            Donate<span className="sr-only"> to {fundraiser.title}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
