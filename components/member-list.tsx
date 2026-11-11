import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
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
import { MemberStatusBadge } from '@/components/portal/member-row';

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
              <TableHead className=""></TableHead>
              <TableHead className="">Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Membership Status</TableHead>
              <TableHead>Membership Type</TableHead>
              <TableHead>Members in Family</TableHead>
              <TableHead className="text-right">Contribution Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => {
              const plan = currentPlan(member.user_id, subscriptions);

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
                    <MemberStatusBadge status={member.status} />
                  </TableCell>
                  <TableCell>{member.membershipType}</TableCell>
                  <TableCell>{member.totalMembersInFamily}</TableCell>
                  <TableCell colSpan={3} className="text-right">
                    {plan ? (
                      priceLabel(plan.price, plan.quantity)
                    ) : (
                      <span className="text-badge-red-text">
                        Yet to choose contribution plan
                      </span>
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
