'use client';

import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { ListGroup } from '@/components/portal/list-row';
import { MemberStatusBadge } from '@/components/portal/member-row';
import { PersonRow } from '@/components/ui/person-row';
import { StatePanel } from '@/components/ui/state-panel';
import { StatTile } from '@/components/ui/stat-tile';
import { formatMoney } from '@/utils/format';
import { Loaded, Screen } from '~/components/screen';
import { MembersOnly } from '~/components/home/membership';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** The member directory, as the website's /members shows it. Approved active members only. */
export default function Members() {
  return (
    <Screen title="Members" back={{ label: 'More' }}>
      <MembersOnly>{() => <Directory />}</MembersOnly>
    </Screen>
  );
}

function Directory() {
  const state = useData(async () => {
    const [members, subscriptions, prices] = await Promise.all([
      must(
        supabase
          .from('members')
          .select('*')
          .order('fullName', { ascending: true })
      ),
      must(supabase.from('subscriptions').select('id, status, price_id')),
      must(supabase.from('prices').select('id, unit_amount, interval'))
    ]);
    return {
      members: members ?? [],
      subscriptions: subscriptions ?? [],
      prices: prices ?? []
    };
  });

  return (
    <Loaded state={state}>
      {({ members, subscriptions, prices }) => {
        const active = members.filter((m) => m.status === 'active');
        // The website's plan column: the plan's price times the family size, or "Yet to choose" without an active plan.
        const plan = (m: (typeof members)[number]) => {
          const sub = subscriptions.find((s) => s.id === m.subscription_id);
          const price = prices.find((p) => p.id === sub?.price_id);
          return sub?.status === 'active'
            ? `${formatMoney((price?.unit_amount ?? 0) * (m.totalMembersInFamily ?? 0))} / ${price?.interval}`
            : 'No contribution plan yet';
        };
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Registered"
                value={active.length}
                note="Heads of family and individuals"
              />
              <StatTile
                label="Contributing"
                value={active.reduce(
                  (sum, m) => sum + (m.totalMembersInFamily ?? 0),
                  0
                )}
                note="Everyone in members’ families"
              />
            </div>
            {members.length ? (
              <ListGroup>
                <ul aria-label="Members">
                  {members.map((m) => (
                    <li key={m.id} className="border-b last:border-b-0">
                      <Link
                        href={`/more/members/view/?id=${m.id}`}
                        className="flex min-h-14 items-center gap-3 py-1.5 pl-4 pr-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <PersonRow
                          className="flex-1"
                          name={m.fullName ?? 'Unnamed member'}
                          secondary={[m.city, plan(m)]
                            .filter(Boolean)
                            .join(' · ')}
                          trailing={<MemberStatusBadge status={m.status} />}
                        />
                        <ChevronRight
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </ListGroup>
            ) : (
              <StatePanel icon={Users} title="No members yet" />
            )}
          </>
        );
      }}
    </Loaded>
  );
}
