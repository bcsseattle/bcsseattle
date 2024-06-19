import MemberList from '@/components/member-list';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Members() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: members } = await supabase.from('members').select('*');

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  if (!user) {
    return redirect('/signin');
  }

  if (member?.status !== 'active') {
    return redirect('/membership-fee');
  }

  return (
    <>
      <MemberList members={members || []} />
    </>
  );
}
