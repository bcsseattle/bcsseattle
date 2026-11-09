'use client';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import { User } from '@supabase/supabase-js';
import Navlinks, { MobileNav } from './ui/Navbar/Navlinks';
import { Member } from '@/types';

interface Props {
  user: User | null | undefined;
  member: Member | null | undefined;
  isAdmin?: boolean;
}
export default function TopNavigation({ user, member, isAdmin }: Props) {
  return (
    <div>
      {/* Wide screens get the dropdown menu; phones a compact one (BUG-050). */}
      <div className="hidden lg:block">
        <NavigationMenu>
          <Navlinks user={user} member={member} isAdmin={isAdmin} />
        </NavigationMenu>
      </div>
      <div className="lg:hidden">
        <MobileNav user={user} member={member} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
