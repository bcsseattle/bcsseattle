import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { MembersTable } from '@/components/admin/members-table';
import { PageHeader } from '@/components/portal/page-header';

export default async function AdminMembersPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated and is admin
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin?redirectTo=/admin/members');
  }

  // Check if user is admin using the is_admin column
  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!userProfile || !userProfile.is_admin) {
    return redirect('/'); // Redirect non-admin users
  }

  // Fetch all members data
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching members:', error);
  }

  // Emails live in auth.users, which only the service role can list: one call,
  // not one per member (BUG-036).
  // ponytail: first 1000 accounts; page through listUsers if the site outgrows that.
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email]) ?? []);
  const membersWithEmails = (members || []).map((member) => ({
    ...member,
    email: (member.user_id && emailById.get(member.user_id)) || 'No email'
  }));

  // pending: applied, not approved (older applications were saved as 'inactive');
  // rejected: application refused; active / inactive: approved members (BUG-035).
  const stateOf = (status: string | null, isApproved: boolean) =>
    (status === 'rejected' ? 'rejected' : !isApproved ? 'pending' : status === 'active' ? 'active' : 'inactive') as
      | 'rejected'
      | 'pending'
      | 'active'
      | 'inactive';

  // Admin › Members (Figma 7:572). The queries and the approval actions are
  // unchanged; the table filters and orders the loaded members.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description="Review membership applications and manage member status. Approved members can vote in elections and join community funds."
      />
      <MembersTable
        members={membersWithEmails.map((member) => ({ ...member, state: stateOf(member.status, member.isApproved) }))}
      />
    </div>
  );
}
