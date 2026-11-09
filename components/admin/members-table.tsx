'use client';

import * as React from 'react';
import { Users } from 'lucide-react';

import MemberApprovalActions from '@/components/admin/MemberApprovalActions';
import { MemberRow, type MemberStatus } from '@/components/portal/member-row';
import { SearchBar } from '@/components/ui/search-bar';
import { StatePanel } from '@/components/ui/state-panel';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/utils/format';

type MemberWithState = React.ComponentProps<typeof MemberApprovalActions>['member'] & {
  created_at: string;
  email?: string;
  state: MemberStatus;
};

const TABS: { value: 'all' | MemberStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'rejected', label: 'Rejected' }
];

/**
 * Admin › Members table (Figma 7:679): status tabs with counts and a search
 * field, both filtering the members already on the page; pending
 * applications first. Each row is a MemberRow with the existing approval
 * actions.
 */
export function MembersTable({ members }: { members: MemberWithState[] }) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]['value']>('all');
  const [query, setQuery] = React.useState('');

  const count = (value: (typeof TABS)[number]['value']) =>
    value === 'all' ? members.length : members.filter((m) => m.state === value).length;
  const q = query.trim().toLowerCase();
  const shown = members
    .filter((m) => tab === 'all' || m.state === tab)
    .filter((m) => !q || [m.fullName, m.email, m.phone].some((v) => v?.toLowerCase().includes(q)))
    // Pending first; otherwise the page's order (newest first).
    .sort((a, b) => Number(b.state === 'pending') - Number(a.state === 'pending'));

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList aria-label="Member status">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} count={count(t.value)}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <SearchBar
        aria-label="Search members"
        placeholder="Search by name, email or phone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="overflow-hidden rounded-lg border bg-card">
        {shown.length === 0 ? (
          <StatePanel icon={Users} title={members.length ? 'No members match' : 'No members found'}>
            {members.length ? 'Try another tab or search.' : 'No member applications have been submitted yet.'}
          </StatePanel>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((member) => (
                  <MemberRow
                    key={member.id}
                    name={member.fullName ?? 'Unnamed member'}
                    email={member.email}
                    phone={member.phone}
                    status={member.state}
                    registered={formatDate(member.created_at)}
                    actions={<MemberApprovalActions member={member} />}
                  />
                ))}
              </TableBody>
            </Table>
            <p className="mt-0 border-t px-4 py-3 text-sm text-muted-foreground">Pending applications are listed first.</p>
          </>
        )}
      </div>
    </div>
  );
}
