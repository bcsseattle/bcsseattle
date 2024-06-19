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
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Member } from '@/types';

export default function MemberList({ members }: { members: Member[] }) {
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
              <TableHead>Status</TableHead>
              <TableHead>Membership Type</TableHead>
              <TableHead className="text-right">Members in Family</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => (
              <TableRow key={member.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{member.fullName}</TableCell>
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
                <TableCell colSpan={3} className="text-right">
                  {member.totalMembersInFamily}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
