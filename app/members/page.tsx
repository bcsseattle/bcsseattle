import MemberList from '@/components/member-list';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Member } from '@/types';
import { createClient } from '@/utils/supabase/server';
import { PersonIcon } from '@radix-ui/react-icons';
import { redirect } from 'next/navigation';

export default async function Members() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('fullName', { ascending: true });

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*');

  const { data: prices } = await supabase.from('prices').select('*');

  if (!member?.isApproved) {
    return redirect(`/members/${member?.id}/pending`);
  }

  if (member?.status !== 'active') {
    return redirect('/membership-fee');
  }

  const activeMembers = members?.filter(
    (member: any) => member.status === 'active'
  );

  const totalFamilyMembers = activeMembers?.reduce(
    (acc: number, member: Member) => acc + (member.totalMembersInFamily ?? 0),
    0
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="">
          <CardHeader>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-large">
                Total registered members
              </CardTitle>
              <PersonIcon />
            </div>
            <CardDescription>
              This includes both head of family and individual members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers?.length}</div>
          </CardContent>
        </Card>
        <Card className="">
          <CardHeader>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-large">
                Contributing members
              </CardTitle>
              <div>
                <PersonIcon />
                <PersonIcon />
              </div>
            </div>
            <CardDescription>
              This includes all members who are paying either{' '}
              <span className="font-medium text-secondary">$5/month</span> or{' '}
              <span className="font-medium text-primary">$60/year</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFamilyMembers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <MemberList
          members={members || []}
          subscriptions={subscriptions || []}
          prices={prices || []}
        />
      </div>
    </>
  );
}
