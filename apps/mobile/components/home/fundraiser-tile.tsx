'use client';

import Link from 'next/link';
import { ImageIcon } from 'lucide-react';
import type { Tables } from '@/types_db';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDate, formatMoney } from '@/utils/format';

/**
 * BCS/Fundraiser card (3:290) for the app: the website's FundraiserCard links
 * to website routes and uses next/image, so this one links to the app's
 * fundraiser screen. Amounts are whole dollars in the table, as on the website.
 */
export function FundraiserTile({
  fundraiser: f
}: {
  fundraiser: Tables<'fundraisers'>;
}) {
  const href = `/give/fundraisers/view/?id=${f.id}`;
  const raised = f.current_amount ?? 0;
  const progress = Math.min(100, (raised / f.goal_amount) * 100);
  const category = f.category
    ? f.category.charAt(0).toUpperCase() + f.category.slice(1)
    : null;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex h-[216px] flex-col items-center justify-center gap-1 bg-mat">
        {f.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer
          <img src={f.image_url} alt="" className="size-full object-contain" />
        ) : (
          <>
            <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
            <span className="text-caption text-muted-foreground">No image</span>
          </>
        )}
      </div>
      <div className="flex flex-col items-start gap-3 p-4">
        {category && <Badge tone="neutral">{category}</Badge>}
        <h3 className="text-item text-foreground">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {f.title}
          </Link>
        </h3>
        {f.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {f.description}
          </p>
        )}
        <Progress
          value={progress}
          aria-label={`${Math.round(progress)}% of the goal raised`}
        />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {formatMoney(raised * 100, { whole: true })} raised
          </span>
          <span className="text-caption text-muted-foreground">
            of {formatMoney(f.goal_amount * 100, { whole: true })}
          </span>
        </div>
        {f.ends_at && (
          <span className="text-caption text-muted-foreground">
            Ends {formatDate(f.ends_at)}
          </span>
        )}
        <Link
          href={href}
          className={buttonVariants({
            variant: 'outline',
            size: 'lg',
            className: 'relative z-10 w-full'
          })}
        >
          Donate<span className="sr-only"> to {f.title}</span>
        </Link>
      </div>
    </article>
  );
}
