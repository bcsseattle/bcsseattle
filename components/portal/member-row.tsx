import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { PersonRow } from '@/components/ui/person-row';
import { TableCell, TableRow } from '@/components/ui/table';

// Member statuses with their words and tones (Figma 3:412). "Rejected" isn't in
// the mock; it follows the same pattern in red.
const STATUS = {
  pending: { label: 'Pending', tone: 'orange' },
  active: { label: 'Active', tone: 'green' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  rejected: { label: 'Rejected', tone: 'red' }
} as const;

export type MemberStatus = keyof typeof STATUS;

export function MemberStatusBadge({ status }: { status: string | null | undefined }) {
  const s = STATUS[(status ?? '') as MemberStatus];
  return s ? <Badge tone={s.tone}>{s.label}</Badge> : <Badge tone="neutral">{status ?? 'Unknown'}</Badge>;
}

/**
 * BCS/Member row (Figma 3:412): the member (name and email), phone, status,
 * registration date and the row's actions. A table row under headers Member,
 * Phone, Status, Registered.
 */
export function MemberRow({
  name,
  email,
  phone,
  status,
  registered,
  actions
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string | null | undefined;
  registered: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell className="min-w-[14rem]">
        <PersonRow name={name} secondary={email} />
      </TableCell>
      <TableCell className="whitespace-nowrap">{phone}</TableCell>
      <TableCell>
        <MemberStatusBadge status={status} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{registered}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">{actions}</div>
      </TableCell>
    </TableRow>
  );
}
