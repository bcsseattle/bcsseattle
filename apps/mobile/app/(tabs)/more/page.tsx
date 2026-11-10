'use client';

import { BookOpen, CircleUser, Shield, Users } from 'lucide-react';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { AppHeader } from '~/components/app-header';
import { RowButton, Section } from '~/components/screen';
import { SITE_URL } from '~/lib/api';
import { openOutside } from '~/lib/open';
import { useMember } from '~/lib/member';

/** The fifth tab: Account, the member directory and resources; Admin for admins (opens the website). */
export default function MoreTab() {
  const { data: member } = useMember();
  return (
    <>
      <AppHeader title="More" />
      <div className="flex flex-col gap-6 px-4 pb-6">
        <Section>
          <ListGroup>
            <ListRow label="Account" icon={CircleUser} href="/more/account/" />
            {member?.isActive && <ListRow label="Members" icon={Users} href="/more/members/" />}
            <ListRow label="Resources" icon={BookOpen} href="/more/resources/" />
          </ListGroup>
        </Section>
        {member?.isAdmin && (
          <Section label="Admin">
            <ListGroup>
              <RowButton label="Open admin on the website" icon={Shield} onClick={() => openOutside(`${SITE_URL}/admin/members`)} />
            </ListGroup>
          </Section>
        )}
      </div>
    </>
  );
}
