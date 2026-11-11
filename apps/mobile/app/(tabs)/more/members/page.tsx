'use client';

import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { ListGroup } from '@/components/portal/list-row';
import { PersonRow } from '@/components/ui/person-row';
import { StatePanel } from '@/components/ui/state-panel';
import { StatTile } from '@/components/ui/stat-tile';
import { Loaded, Screen } from '~/components/screen';
import { membershipOf } from '~/components/account/labels';
import { currentPlan, PLAN_SUBSCRIPTION_SELECT, priceLabel } from '@/utils/membership/plan';
import { MemberBadge, MembersOnly } from '~/components/home/membership';
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
    const [members, subscriptions] = await Promise.all([
      must(
        supabase
          .from('members')
          .select('*')
          .order('fullName', { ascending: true })
      ),
      must(supabase.from('subscriptions').select(PLAN_SUBSCRIPTION_SELECT))
    ]);
    return {
      members: members ?? [],
      subscriptions: subscriptions ?? []
    };
  });

  return (
    <Loaded state={state}>
      {({ members, subscriptions }) => {
        const active = members.filter((m) => membershipOf(m) === 'active');
        // The same plan the website's directory shows (utils/membership/plan.ts).
        const plan = (m: (typeof members)[number]) => {
          const current = currentPlan(m.user_id, subscriptions);
          return current ? priceLabel(current.price, current.quantity) : 'No contribution plan yet';
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
                          trailing={<MemberBadge member={m} />}
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
