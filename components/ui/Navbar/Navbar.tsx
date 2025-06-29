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
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <div className="self-center justify-start w-96">
          <Link href={'/'} className="flex justify-center items-center">
            <Logo className="object-cover h-36" />
            <h1 className="text-xl ml-4 text-secondary">
              Baloch Community Services of Seattle
            </h1>
          </Link>
        </div>

        <div className="self-center">
          <TopNavigation user={user} member={member} isAdmin={isAdmin} />
        </div>
      </div>
    </nav>
  );
}
