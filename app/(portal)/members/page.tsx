import MemberList from '@/components/member-list';
import { PageHeader } from '@/components/portal/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { Member } from '@/types';
import { createClient } from '@/utils/supabase/server';
import { PLAN_SUBSCRIPTION_SELECT } from '@/utils/membership/plan';
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

  // Each member's plan comes from their own subscriptions (utils/membership/plan.ts).
  const { data: subscriptions } = await supabase.from('subscriptions').select(PLAN_SUBSCRIPTION_SELECT);

  // Signed in but never registered: there's no member to show a status for (BUG-056).
  if (!member) {
    return redirect('/register');
  }

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
    <div className="flex flex-col gap-6">
      <PageHeader title="Member directory" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total registered members"
          value={activeMembers?.length}
          note="This includes both head of family and individual members"
        />
        <StatTile
          label="Contributing members"
          value={totalFamilyMembers}
          note="This includes all members who are paying either USD 5/month or USD 60/year."
        />
      </div>
      <MemberList
        members={members || []}
        subscriptions={subscriptions || []}
      />
    </div>
  );
}
