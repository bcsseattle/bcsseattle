import { PortalMenu } from '@/components/portal/portal-menu';
import { PortalSidebar } from '@/components/portal/portal-sidebar';
import SiteShell from '@/components/site/site-shell';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { createClient } from '@/utils/supabase/server';

/**
 * The member portal frame (Figma 7:572): the sidebar and a 52px top bar with
 * breadcrumbs. Below lg the sidebar opens from a Menu button (plan,
 * Decision 3). Anyone who isn't an approved member or an admin (signed out,
 * pending) sees the public site frame instead; each page's own access checks
 * and redirects are unchanged.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // The same reads the old header nav made to decide which menus to show.
  let isMember = false;
  let isAdmin = false;
  if (user) {
    const [{ data: member }, { data: profile }] = await Promise.all([
      supabase.from('members').select('status, isApproved').eq('user_id', user.id).maybeSingle(),
      supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle()
    ]);
    isMember = !!member && (member.status === 'active' || !!member.isApproved);
    isAdmin = !!profile?.is_admin;
  }

  if (!isMember && !isAdmin) {
    return <SiteShell>{children}</SiteShell>;
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card lg:block">
        <PortalSidebar isMember={isMember} isAdmin={isAdmin} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-13 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <PortalMenu isMember={isMember} isAdmin={isAdmin} />
          <Breadcrumbs portal />
        </header>
        <main id="skip" className="w-full max-w-[1200px] flex-1 px-4 pb-16 pt-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
