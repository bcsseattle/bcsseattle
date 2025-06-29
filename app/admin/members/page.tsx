import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, User, Mail, Calendar } from 'lucide-react';
import MemberApprovalActions from '@/components/admin/MemberApprovalActions';

type Member = {
  id: string;
  user_id: string | null;
  status: string | null;
  created_at: string;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  isApproved: boolean;
  membershipType: string | null;
  email?: string; // Added from auth data
};

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

  // Get user emails from auth for each member
  const membersWithEmails = await Promise.all(
    (members || []).map(async (member) => {
      if (member.user_id) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(member.user_id);
        return {
          ...member,
          email: authUser?.email || 'No email'
        };
      }
      return {
        ...member,
        email: 'No email'
      };
    })
  );

  const pendingMembers = membersWithEmails?.filter(m => m.status === 'pending' || !m.isApproved) || [];
  const activeMembers = membersWithEmails?.filter(m => m.status === 'active' || m.isApproved) || [];
  const inactiveMembers = membersWithEmails?.filter(m => m.status === 'inactive') || [];

  const getStatusIcon = (status: string | null, isApproved: boolean) => {
    if (!isApproved || status === 'pending') {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (status === 'active' || isApproved) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (status === 'inactive') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <User className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string | null, isApproved: boolean) => {
    if (!isApproved || status === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>;
    }
    if (status === 'active' || isApproved) {
      return <Badge variant="default" className="bg-green-600">Active</Badge>;
    }
    if (status === 'inactive') {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Member Management</h1>
        <p className="text-muted-foreground">
          Review and approve member applications
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Approved and active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membersWithEmails?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              All registered members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            Manage member applications and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersWithEmails?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(member.status, member.isApproved)}
                        <div>
                          <div className="font-medium">{member.fullName}</div>
                          {member.address && (
                            <div className="text-sm text-muted-foreground">
                              {member.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{member.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.phone || (
                        <span className="text-muted-foreground">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(member.status, member.isApproved)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MemberApprovalActions member={member} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!membersWithEmails || membersWithEmails.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No members found</h3>
              <p className="text-muted-foreground">
                No member applications have been submitted yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
