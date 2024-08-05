import MemberList from '@/components/member-list';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Members() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

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

  if (!user) {
    return redirect('/signin');
  }

  if (member?.status !== 'active') {
    return redirect('/membership-fee');
  }

  return (
    <>
      <MemberList
        members={members || []}
        subscriptions={subscriptions || []}
        prices={prices || []}
      />
    </>
  );
}
