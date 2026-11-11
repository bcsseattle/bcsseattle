'use client';

import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/components/ui/use-table-sort';
import { memberState } from '@/utils/membership/state';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { MembershipBadge } from '@/components/portal/member-row';

import { Member } from '@/types';
import { currentPlan, priceLabel, type PlanSubscription } from '@/utils/membership/plan';
import Link from 'next/link';

export default function MemberList({
  members,
  subscriptions
}: {
  members: Member[];
  subscriptions: PlanSubscription[];
}) {
  const rows = members.map((member, index) => ({ member, index, plan: currentPlan(member.user_id, subscriptions) }));
  const { sortedRows, sortProps } = useTableSort(rows, {
    number: (r) => r.index,
    name: (r) => r.member.fullName,
    city: (r) => r.member.city,
    status: (r) => memberState(r.member).label,
    type: (r) => r.member.membershipType,
    family: (r) => r.member.totalMembersInFamily,
    plan: (r) => r.plan ? (r.plan.price.unit_amount ?? 0) * (r.plan.quantity ?? 1) : null
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>BCS Seattle Members</CardTitle>
        <CardDescription>
          Currently registered members of Baloch Community Services of Seattle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption></TableCaption>
          <TableHeader>
            <TableRow>
              <SortableTableHead {...sortProps('number')}><span className="sr-only">Number</span></SortableTableHead>
              <SortableTableHead className="" {...sortProps('name')}>Name</SortableTableHead>
              <SortableTableHead {...sortProps('city')}>City</SortableTableHead>
              <SortableTableHead {...sortProps('status')}>Membership Status</SortableTableHead>
              <SortableTableHead {...sortProps('type')}>Membership Type</SortableTableHead>
              <SortableTableHead {...sortProps('family')}>Members in Family</SortableTableHead>
              <SortableTableHead className="text-right" {...sortProps('plan')}>Contribution Plan</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map(({ member, index, plan }) => {

              return (
                <TableRow key={member.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/members/${member.id}`}
                      className="text-accent hover:text-foreground focus:text-foreground active:text-foreground"
                    >
                      {member.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{member.city}</TableCell>
                  <TableCell>
                    <MembershipBadge member={member} />
                  </TableCell>
                  <TableCell>{member.membershipType}</TableCell>
                  <TableCell>{member.totalMembersInFamily}</TableCell>
                  <TableCell className="text-right">
                    {plan ? (
                      priceLabel(plan.price, plan.quantity)
                    ) : (
                      <span className="text-muted-foreground">No contribution plan yet</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
