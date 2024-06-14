'use client';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import { User } from '@supabase/supabase-js';
import Navlinks from './ui/Navbar/Navlinks';

interface Props {
  user: User | null | undefined;
}
export default function TopNavigation({ user }: Props) {
  return (
    <div>
      <NavigationMenu>
        <Navlinks user={user} />
      </NavigationMenu>
    </div>
  );
}
