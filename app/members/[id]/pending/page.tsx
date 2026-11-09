import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function PendingMembers() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return <p>Please sign in to view your membership status.</p>;
  }
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) {
    return (
      <p>
        You are not a member. Please register to view your membership status.
      </p>
    );
  }
  if (member.isApproved) {
    return redirect(`/members/${member.id}`);
  }
  if (member.status === 'inactive') {
    return (
      <p>Your membership is inactive. Please contact support for assistance.</p>
    );
  }
  if (member.status !== 'pending') {
    return (
      <p>Your membership status is not recognized. Please contact support.</p>
    );
  }

  return (
    <div className="p-4 relative">
      <h1 className="text-2xl font-bold mb-4">Membership Status: Pending</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <p>
          Your membership status is pending approval. Once approved, you will be
          able to view BCS community details.
        </p>
      </div>
    </div>
  );
}
