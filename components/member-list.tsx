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
import { Badge } from '@/components/ui/badge';

import { Member, Price, Subscription } from '@/types';

export default function MemberList({
  members,
  subscriptions,
  prices
}: {
  members: Member[];
  subscriptions: Subscription[];
  prices: Price[];
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
              const subscription = subscriptions?.find(
                (sub) => sub.id === member.subscription_id
              );

              const price = prices?.find(
                (price) => price.id === subscription?.price_id
              );

              const priceString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }).format(((price?.unit_amount || 0) * member.totalMembersInFamily || 0) / 100);

              return (
                <TableRow key={member.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {member.fullName}
                  </TableCell>
                  <TableCell>{member.city}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member?.status === 'active' ? 'default' : 'destructive'
                      }
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.membershipType}</TableCell>
                  <TableCell>{member.totalMembersInFamily}</TableCell>
                  <TableCell colSpan={3} className="text-right">
                    {subscription?.status === 'active' ? (
                      `${priceString} / ${price?.interval}`
                    ) : (
                      <span className="text-red-700">
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
