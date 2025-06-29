import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Settings, Shield, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!userProfile || !userProfile.is_admin) {
    return redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Site
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Logged in as {user.email}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="container mx-auto px-4 py-6">
        <Card className="p-4 mb-6">
          <nav className="flex space-x-4">
            <Link href="/admin/members">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Members</span>
              </Button>
            </Link>
            <Link href="/admin/elections">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Elections</span>
              </Button>
            </Link>
          </nav>
        </Card>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
