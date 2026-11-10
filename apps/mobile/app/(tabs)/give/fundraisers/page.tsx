'use client';

import Link from 'next/link';
import { FundraiserList } from '@/components/fundraisers/fundraiser-list';
import { buttonVariants } from '@/components/ui/button';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { Loaded, Screen } from '~/components/screen';
import { AppFundraiserCard } from '~/components/give/fundraiser-card';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** Fundraisers (Figma 14:2052): the active ones, as on the website's /fundraisers, with category tabs. */
export default function Fundraisers() {
  const state = useData(async () =>
    (await must(supabase.from('fundraisers').select('*').eq('status', 'active').order('created_at', { ascending: false }))) ?? []
  );

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
        {(fundraisers) => (
          <FundraiserList
            fundraisers={fundraisers}
            card={(f) => <AppFundraiserCard fundraiser={f} />}
            counts
            tabClassName="h-11"
            className="gap-6"
            emptyAction={
              <Link href="/give/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Give to the general fund
              </Link>
            }
          />
        )}
      </Loaded>
    </Screen>
  );
}
