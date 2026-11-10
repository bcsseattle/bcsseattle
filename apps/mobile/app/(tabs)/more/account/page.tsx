'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, ChevronRight, FileText, Receipt, SlidersHorizontal, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonRow } from '@/components/ui/person-row';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { AppHeader } from '~/components/app-header';
import { Loaded, RowButton, Section } from '~/components/screen';
import { priceLabel } from '~/components/account/labels';
import { loadMembership, openBillingPortal } from '~/components/account/membership';
import { MemberBadge } from '~/components/home/membership';
import { useMember } from '~/lib/member';
import { useSession } from '~/lib/session';
import { signOut } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** Account (Figma 19:2559), pushed from More. */
export default function Account() {
  const router = useRouter();
  const userId = useSession().session?.user.id;
  const me = useMember();
  const membership = useData(() => loadMembership(userId!), [userId]);
  const [pending, setPending] = useState<'signout' | 'portal'>();

  return (
    <>
      <AppHeader title="Account" back={{ label: 'More' }} />
      <div className="flex flex-col gap-6 px-4 py-4 pb-8">
        <Loaded state={me}>
          {({ member, fullName, email }) => {
            const extra = membership.data;
            const gifts = extra?.gifts;
            return (
              <>
                <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                  <PersonRow
                    className="flex-1"
                    name={fullName || email}
                    secondary={
                      member
                        ? `Member since ${new Date(member.created_at).getFullYear()}`
                        : 'You haven’t applied for membership'
                    }
                  />
                  <MemberBadge member={member} />
                </div>

                <Section label="Membership">
                  <ListGroup>
                    {!member && <ListRow label="Apply for membership" icon={UserPlus} href="/apply/" />}
                    {member && (
                      <>
                        <ListRow
                          label="My contribution"
                          icon={Banknote}
                          value={
                            extra &&
                            (extra.subscription?.prices
                              ? priceLabel(extra.subscription.prices, extra.subscription.quantity)
                              : 'Start a plan')
                          }
                          href="/more/account/contribution/"
                        />
                        <RowButton
                          label="Plan & payment method"
                          icon={SlidersHorizontal}
                          value={
                            // The mock's chevron, which ListRow draws but RowButton doesn't.
                            <span className="flex items-center gap-3">
                              {pending === 'portal' ? 'Opening…' : 'Stripe'}
                              <ChevronRight aria-hidden className="size-4" />
                            </span>
                          }
                          onClick={async () => {
                            if (pending) return;
                            setPending('portal');
                            await openBillingPortal();
                            setPending(undefined);
                          }}
                        />
                        <ListRow
                          label="Contribution receipts"
                          icon={FileText}
                          value={`Tax year ${new Date().getFullYear()}`}
                          href="/more/account/receipts/"
                        />
                      </>
                    )}
                    <ListRow
                      label="Donation history"
                      icon={Receipt}
                      value={gifts !== undefined && `${gifts} ${gifts === 1 ? 'gift' : 'gifts'}`}
                      href="/more/account/donations/"
                    />
                  </ListGroup>
                  {membership.error && <p className="px-1 text-caption text-muted-foreground">{membership.error}</p>}
                </Section>

                <Section label="Profile">
                  <ListGroup>
                    <ListRow label="Name" value={fullName ?? 'Add your name'} href="/more/account/name/" />
                    <ListRow label="Email" value={email} href="/more/account/email/" />
                    <ListRow label="Password & sign-in" href="/signin/new-password/?from=account" />
                  </ListGroup>
                </Section>
              </>
            );
          }}
        </Loaded>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pending === 'signout'}
          onClick={async () => {
            setPending('signout');
            await signOut();
            router.replace('/signin/');
          }}
        >
          Sign out
        </Button>
        <ListGroup>
          <RowButton
            label="Delete account"
            icon={Trash2}
            tone="destructive"
            onClick={() => router.push('/more/account/delete/')}
          />
        </ListGroup>
        {/* The website footer's line (components/site/site-footer.tsx), as in the Account mock. */}
        <p className="text-center text-caption text-muted-foreground">
          BCS Seattle · 501(c)(3) nonprofit · EIN 99-2495973
        </p>
      </div>
    </>
  );
}
