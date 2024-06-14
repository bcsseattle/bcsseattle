import { createClient } from '@/utils/supabase/server';
import Logo from '@/components/icons/Logo';
import Link from 'next/link';
import TopNavigation from '@/components/top-navigation';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <nav className='border-b bg-white'> 
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <div className="self-center justify-start w-96">
          <Link href={'/'} className='flex justify-center items-center'>
            <Logo className="object-cover h-36" />
            <h1 className='text-xl ml-4 text-secondary'>Baloch Community Services of Seattle</h1>
          </Link>
        </div>

        <div className="self-center">
          <TopNavigation user={user} />
        </div>
      </div>
    </nav>
  );
}
