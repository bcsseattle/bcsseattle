'use client';

import * as React from 'react';
import Link from 'next/link';
import { Banknote } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Fundraiser } from '@/types';
import { cn } from '@/utils/cn';
import { categoryLabel } from '@/utils/giving';
import { FundraiserCard } from './fundraiser-card';

interface FundraiserListProps {
  fundraisers: Fundraiser[];
  /** Draws each card; the website's FundraiserCard by default. */
  card?: (fundraiser: Fundraiser) => React.ReactNode;
  /** Show how many fundraisers each tab holds (the app). */
  counts?: boolean;
  /** Classes for each tab, e.g. the app's 44pt `h-11`. */
  tabClassName?: string;
  /** The empty state's action, in place of the website's link to /donate. */
  emptyAction?: React.ReactNode;
  className?: string;
}

const ALL = 'all';

/**
 * Fundraisers grid with category tabs (Figma 6:301), for the website and the
 * app. The tabs filter the fundraisers already loaded and only list categories
 * that have one. Empty state: Figma 6:534.
 */
export function FundraiserList({
  fundraisers,
  card = (fundraiser) => <FundraiserCard fundraiser={fundraiser} />,
  counts,
  tabClassName,
  emptyAction,
  className
}: FundraiserListProps) {
  const [category, setCategory] = React.useState(ALL);

  if (!fundraisers?.length) {
    return (
      <StatePanel
        icon={Banknote}
        title="No active fundraisers right now"
        // Secondary, not the mock's Primary: the header's Donate is this page's one primary.
        action={
          emptyAction ?? (
            <Link href="/donate" className={buttonVariants({ variant: 'outline' })}>
              Donate to the general fund
            </Link>
          )
        }
      >
        When the board opens a new fundraiser it will appear here. You can still give to BCS Seattle’s general fund at
        any time.
      </StatePanel>
    );
  }

  const categories = Array.from(new Set(fundraisers.map((f) => f.category).filter(Boolean))) as string[];
  const shown = category === ALL ? fundraisers : fundraisers.filter((f) => f.category === category);
  const count = (c: string) => (counts ? fundraisers.filter((f) => c === ALL || f.category === c).length : undefined);

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {categories.length > 1 && (
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList aria-label="Category">
            <TabsTrigger value={ALL} count={count(ALL)} className={tabClassName}>
              All
            </TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c} count={count(c)} className={tabClassName}>
                {categoryLabel(c)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {shown.map((fundraiser) => (
          <React.Fragment key={fundraiser.id}>{card(fundraiser)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
