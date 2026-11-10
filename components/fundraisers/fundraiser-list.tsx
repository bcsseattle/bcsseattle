'use client';

import * as React from 'react';
import Link from 'next/link';
import { Banknote } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Fundraiser } from '@/types';
import { FundraiserCard } from './fundraiser-card';

interface FundraiserListProps {
  fundraisers: Fundraiser[];
}

const ALL = 'all';
const label = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);

/**
 * Fundraisers grid with category tabs (Figma 6:301). The tabs filter the
 * fundraisers already on the page and only list categories that have one.
 * Empty state: Figma 6:534.
 */
export function FundraiserList({ fundraisers }: FundraiserListProps) {
  const [category, setCategory] = React.useState(ALL);

  if (!fundraisers?.length) {
    return (
      <StatePanel
        icon={Banknote}
        title="No active fundraisers right now"
        // Secondary, not the mock's Primary: the header's Donate is this page's one primary.
        action={
          <Link href="/donate" className={buttonVariants({ variant: 'outline' })}>
            Donate to the general fund
          </Link>
        }
      >
        When the board opens a new fundraiser it will appear here. You can still give to BCS Seattle’s general fund at
        any time.
      </StatePanel>
    );
  }

  const categories = Array.from(new Set(fundraisers.map((f) => f.category).filter(Boolean))) as string[];
  const shown = category === ALL ? fundraisers : fundraisers.filter((f) => f.category === category);

  return (
    <div className="flex flex-col gap-8">
      {categories.length > 1 && (
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList aria-label="Category">
            <TabsTrigger value={ALL}>All</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>
                {label(c)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {shown.map((fundraiser) => (
          <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
        ))}
      </div>
    </div>
  );
}
