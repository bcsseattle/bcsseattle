'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Clock, Lock, UserPlus, UserX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/types_db';
import { memberState, membershipOf, type Membership } from '~/components/account/labels';
import { Loaded } from '~/components/screen';
import { openInApp } from '~/lib/open';
import { useMember, type Me } from '~/lib/member';

/** A member's state as a badge, in words (Account, the directory, a profile). */
export function MemberBadge({ member }: { member: Tables<'members'> | null }) {
  const { label, tone } = memberState(member);
  return <Badge tone={tone}>{label}</Badge>;
}

/** Why a members-only screen is closed to this person, and their one way forward. */
const CLOSED: Record<
  Exclude<Membership, 'active'>,
  { icon: typeof Lock; title: string; body: string; action?: ReactNode }
> = {
  none: {
    icon: UserPlus,
    title: 'Not a member yet',
    body: 'Members vote in BCS elections and see community funds and the member directory. Apply to join BCS Seattle.',
    action: (
      <Link href="/apply/" className={buttonVariants({ size: 'lg' })}>
        Apply for membership
      </Link>
    )
  },
  pending: {
    icon: Clock,
    title: 'Application pending',
    body: 'An admin reviews every application. Once you’re approved, you can vote and see community funds and the member directory.'
  },
  rejected: {
    icon: UserX,
    title: 'Application not approved',
    body: 'Your membership application was not approved. Contact us if you have questions.',
    action: (
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', size: 'lg' })}
        onClick={() => openInApp('/contact-us')}
      >
        Contact us
      </button>
    )
  },
  inactive: {
    icon: Lock,
    title: 'Membership inactive',
    body: 'Voting, community funds and the member directory are for active members. Renew your membership from Account.',
    action: (
      <Link href="/more/account/" className={buttonVariants({ size: 'lg' })}>
        Go to Account
      </Link>
    )
  }
};

export function ClosedPanel({
  membership
}: {
  membership: Exclude<Membership, 'active'>;
}) {
  const { icon, title, body, action } = CLOSED[membership];
  return (
    <StatePanel icon={icon} title={title} action={action}>
      {body}
    </StatePanel>
  );
}

/** Approved active members only, as on the website; everyone else is told why. */
export function MembersOnly({ children }: { children: (me: Me) => ReactNode }) {
  const me = useMember();
  return (
    <Loaded state={me}>
      {(data) => {
        const membership = membershipOf(data.member);
        return membership === 'active' ? (
          children(data)
        ) : (
          <ClosedPanel membership={membership} />
        );
      }}
    </Loaded>
  );
}
