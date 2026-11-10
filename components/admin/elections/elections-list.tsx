'use client';

import * as React from 'react';
import Link from 'next/link';
import { Vote } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminTab } from '@/utils/elections/rules';

export type ElectionListRow = {
  id: string;
  title: string;
  type: string;
  tab: AdminTab;
  phase: { label: string; tone: 'green' | 'blue' | 'orange' | 'red' | 'neutral' };
  /** "Nominations close 1 Dec 2026, 23:59 PST" */
  keyDate: string | null;
  next: { label: string; href: string } | null;
};

const TABS: { value: AdminTab; label: string; empty: string }[] = [
  { value: 'drafts', label: 'Drafts', empty: 'No drafts. Start one with New election.' },
  { value: 'upcoming', label: 'Upcoming', empty: 'No published elections are waiting to open.' },
  { value: 'nominations', label: 'Nominations', empty: 'No election is taking or reviewing nominations.' },
  { value: 'voting', label: 'Voting', empty: 'No election is open for voting.' },
  { value: 'closed', label: 'Closed', empty: 'No closed elections yet.' },
  { value: 'archived', label: 'Archived', empty: 'Nothing archived or cancelled.' }
];

const TYPE_WORD: Record<string, string> = { leadership: 'Leadership', board: 'Board', initiative: 'Initiatives' };

/**
 * Admin › Elections list, after Admin › Members (Figma 7:572): tabs with
 * counts, then one row per election with its phase, the date that matters
 * next and the next action. Opens on the first tab with something in it.
 */
export function ElectionsList({ rows }: { rows: ElectionListRow[] }) {
  const firstBusy = TABS.find((t) => t.value !== 'archived' && rows.some((r) => r.tab === t.value))?.value ?? 'drafts';
  const [tab, setTab] = React.useState<AdminTab>(firstBusy);
  const shown = rows.filter((r) => r.tab === tab);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>
        <TabsList aria-label="Election phase">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} count={rows.filter((r) => r.tab === t.value).length}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-lg border bg-card">
        {shown.length === 0 ? (
          <StatePanel icon={Vote} title={TABS.find((t) => t.value === tab)!.empty} />
        ) : (
          <ul className="divide-y">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/admin/elections/${r.id}`} className="truncate font-medium text-foreground underline-offset-2 hover:underline">
                    {r.title}
                  </Link>
                  <span className="text-caption text-muted-foreground">{TYPE_WORD[r.type] ?? r.type}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:w-[22rem] md:shrink-0">
                  <Badge tone={r.phase.tone}>{r.phase.label}</Badge>
                  {r.keyDate && <span className="text-sm text-muted-foreground">{r.keyDate}</span>}
                </div>
                <div className="md:w-44 md:shrink-0 md:text-right">
                  {r.next && (
                    <Link href={r.next.href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      {r.next.label}
                      <span className="sr-only">: {r.title}</span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
