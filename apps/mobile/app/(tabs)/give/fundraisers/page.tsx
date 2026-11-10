'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banknote } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loaded, Screen } from '~/components/screen';
import { FundraiserCard, categoryLabel } from '~/components/give/fundraiser-card';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

const ALL = 'all';

/** Fundraisers (Figma 14:2052): the active ones, as on the website's /fundraisers, with category tabs. */
export default function Fundraisers() {
  const state = useData(async () =>
    (await must(supabase.from('fundraisers').select('*').eq('status', 'active').order('created_at', { ascending: false }))) ?? []
  );
  const [category, setCategory] = useState(ALL);

  return (
    <Screen title="Fundraisers" back={{ label: 'Give' }}>
      <Loaded
        state={state}
        skeleton={
          <Loading className="flex flex-col gap-4">
            <Skeleton className="h-[420px] rounded-lg bg-border" />
            <Skeleton className="h-[420px] rounded-lg bg-border" />
          </Loading>
        }
      >
        {(fundraisers) => {
          if (!fundraisers.length) {
            return (
              <StatePanel
                icon={Banknote}
                title="No active fundraisers right now"
                action={
                  <Link href="/give/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                    Give to the general fund
                  </Link>
                }
              >
                When the board opens a new fundraiser it will appear here. You can still give to BCS Seattle’s general
                fund at any time.
              </StatePanel>
            );
          }
          const categories = Array.from(new Set(fundraisers.map((f) => f.category).filter(Boolean))) as string[];
          const shown = category === ALL ? fundraisers : fundraisers.filter((f) => f.category === category);
          return (
            <>
              {categories.length > 1 && (
                <Tabs value={category} onValueChange={setCategory}>
                  <TabsList aria-label="Category">
                    <TabsTrigger value={ALL} count={fundraisers.length} className="h-11">
                      All
                    </TabsTrigger>
                    {categories.map((c) => (
                      <TabsTrigger key={c} value={c} count={fundraisers.filter((f) => f.category === c).length} className="h-11">
                        {categoryLabel(c)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
              <div className="flex flex-col gap-4">
                {shown.map((f) => (
                  <FundraiserCard key={f.id} fundraiser={f} />
                ))}
              </div>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}
