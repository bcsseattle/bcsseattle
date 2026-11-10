'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { ElectionCard } from '@/components/elections/election-card';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/utils/format';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import {
  electionPhase,
  rows,
  typeTags,
  type Election
} from '~/components/elections/election';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

type Row = Election & { types: string[] };

/** Elections tab (Figma 17:2110): current and upcoming elections, and past ones with their results. */
export default function ElectionsTab() {
  const state = useData(async () => {
    const elections = await rows(
      supabase
        .from('elections')
        .select('*')
        .order('start_date', { ascending: true })
    );
    const ids = elections.map((e) => e.id);
    const [positions, initiatives] = await Promise.all([
      rows(supabase.from('election_positions').select('election_type')),
      ids.length
        ? rows(
            supabase
              .from('initiatives')
              .select('election_id')
              .in('election_id', ids)
          )
        : []
    ]);
    // Type tags as on the website: positions are defined per election type (BUG-059).
    const list: Row[] = elections.map((e) => ({
      ...e,
      types: typeTags(e, positions, initiatives)
    }));
    const now = Date.now();
    return {
      current: list.filter((e) => Date.parse(e.end_date) >= now),
      past: list.filter((e) => Date.parse(e.end_date) < now).reverse()
    };
  });

  return (
    <>
      <AppHeader
        title="Elections"
        subtitle="Vote once in each election. Results are published when voting closes."
      />
      <div className="px-4 pb-6 pt-2">
        <Loaded state={state}>
          {({ current, past }) => (
            <Tabs defaultValue="current">
              <TabsList className="w-full">
                <TabsTrigger value="current" count={current.length}>
                  Current & upcoming
                </TabsTrigger>
                <TabsTrigger value="past" count={past.length}>
                  Past
                </TabsTrigger>
              </TabsList>
              <TabsContent value="current" className="mt-4">
                <List
                  elections={current}
                  empty={
                    <StatePanel
                      icon={CheckCircle}
                      title="No elections right now"
                    >
                      When the board opens an election it will appear here.
                    </StatePanel>
                  }
                />
              </TabsContent>
              <TabsContent value="past" className="mt-4">
                <List
                  elections={past}
                  empty={
                    <StatePanel title="No past elections">
                      Closed elections and their results appear here.
                    </StatePanel>
                  }
                />
              </TabsContent>
            </Tabs>
          )}
        </Loaded>
      </div>
    </>
  );
}

function List({
  elections,
  empty
}: {
  elections: Row[];
  empty: React.ReactNode;
}) {
  if (elections.length === 0) return <>{empty}</>;
  // The first open election's Vote now is the screen's one primary action.
  const firstOpen = elections.find((e) => electionPhase(e).votingOpen)?.id;
  return (
    <div className="flex flex-col gap-3">
      {elections.map((e) => {
        const p = electionPhase(e);
        const view = `/elections/view/?id=${e.id}`;
        const action = p.nominationsOpen
          ? { label: 'Nominate', href: `/elections/nominate/?id=${e.id}` }
          : p.votingOpen
            ? { label: 'Vote now', href: view }
            : p.closed
              ? { label: 'Results', href: `/elections/results/?id=${e.id}` }
              : { label: 'View', href: view };
        return (
          <ElectionCard
            key={e.id}
            title={
              <Link href={view} className="underline-offset-4 hover:underline">
                {e.title}
              </Link>
            }
            description={
              e.types.length > 1
                ? 'Vote for leadership positions and community initiatives'
                : e.description
            }
            phase={p.phase}
            types={e.types}
            dates={
              p.nominationsOpen
                ? `Nominations close ${formatDate(e.nomination_end!)}`
                : `${formatDate(e.start_date)} – ${formatDate(e.end_date)}`
            }
            action={
              <Link
                href={action.href}
                className={buttonVariants({
                  variant:
                    e.id === firstOpen && p.votingOpen && !p.nominationsOpen
                      ? 'default'
                      : 'outline',
                  className: 'h-11'
                })}
              >
                {action.label}
                <span className="sr-only">: {e.title}</span>
              </Link>
            }
          />
        );
      })}
    </div>
  );
}
