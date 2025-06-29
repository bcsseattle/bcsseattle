'use client';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import { User } from '@supabase/supabase-js';
import Navlinks from './ui/Navbar/Navlinks';
import { Member } from '@/types';

interface Props {
  user: User | null | undefined;
  member: Member | null | undefined;
}
export default function TopNavigation({ user, member }: Props) {
  return (
    <div>
      <NavigationMenu>
        <Navlinks user={user} member={member} />
      </NavigationMenu>
    </div>
  );
}
