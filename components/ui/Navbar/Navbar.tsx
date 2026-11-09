import { createClient } from '@/utils/supabase/server';
import Logo from '@/components/icons/Logo';
import Link from 'next/link';
import TopNavigation from '@/components/top-navigation';

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  let member: any;
  let isAdmin = false;

  if (user) {
    // Fetch member data
    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    member = memberData;

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    isAdmin = userData?.is_admin || false;
  }

  return (
    <nav className="border-b bg-white">
      <div className="max-w-screen-xl flex items-center justify-between gap-4 mx-auto p-4">
        {/* No fixed width: w-96 made phones scroll sideways (BUG-050). */}
        <div className="self-center justify-start min-w-0">
          <Link href={'/'} className="flex items-center">
            <Logo className="object-cover h-20 sm:h-36 shrink-0" />
            {/* Not a heading: it's on every page, which then had two h1s (BUG-051). */}
            <span className="hidden sm:inline text-xl ml-4 text-foreground">
              Baloch Community Services of Seattle
            </span>
          </Link>
        </div>

        <div className="self-center">
          <TopNavigation user={user} member={member} isAdmin={isAdmin} />
        </div>
      </div>
    </nav>
  );
}
