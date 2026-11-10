'use client';

import { useSearchParams } from 'next/navigation';
import { UserX } from 'lucide-react';
import { MemberStatusBadge } from '@/components/portal/member-row';
import { PersonRow } from '@/components/ui/person-row';
import { StatePanel } from '@/components/ui/state-panel';
import { StatTile } from '@/components/ui/stat-tile';
import { formatDate, formatMoney } from '@/utils/format';
import { Loaded, Screen, Section } from '~/components/screen';
import { MembersOnly } from '~/components/home/membership';
import { MonthPayments } from '~/components/home/month-payments';
import { api, must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** A member's profile, as the website's /members/[id] shows it. Approved active members only. */
export default function MemberProfile() {
  const id = useSearchParams().get('id') ?? '';
  return (
    <Screen title="Member" back={{ label: 'Members', href: '/more/members/' }}>
      <MembersOnly>{() => <Profile id={id} />}</MembersOnly>
    </Screen>
  );
}

function Profile({ id }: { id: string }) {
  const member = useData(
    () =>
      must(
        supabase
          .from('members')
          .select('*, customers(stripe_customer_id)')
          .eq('id', id)
          .maybeSingle()
      ),
    [id]
  );
  // Read from Stripe on the server; it loads on its own so the profile isn't held up by it.
  const total = useData(
    () => api<{ total: number }>(`/api/app/members/${id}/total`),
    [id]
  );

  return (
    <Loaded state={member}>
      {(m) => {
        if (!m) {
          return (
            <StatePanel icon={UserX} title="Member not found">
              This member may have been removed from the directory.
            </StatePanel>
          );
        }
        const name = m.fullName ?? 'Unnamed member';
        // members.stripe_customer_id points at customers.id; the Stripe id is on customers.
        const customer = m.customers?.stripe_customer_id ?? null;
        return (
          <>
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <PersonRow className="flex-1" name={name} secondary={m.city} />
              <MemberStatusBadge status={m.status} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Member since" value={formatDate(m.created_at)} />
              <StatTile
                label="Family members"
                value={m.totalMembersInFamily ?? '—'}
              />
              <StatTile
                label="Membership type"
                value={m.membershipType ?? '—'}
              />
              <StatTile
                label="Contributions"
                value={
                  total.data
                    ? formatMoney(total.data.total)
                    : total.error
                      ? '—'
                      : '…'
                }
                note={total.error ?? 'All time'}
              />
            </div>
            <Section label="Payments">
              <MonthPayments
                names={new Map(customer ? [[customer, name]] : [])}
                customer={customer}
              />
            </Section>
          </>
        );
      }}
    </Loaded>
  );
}
