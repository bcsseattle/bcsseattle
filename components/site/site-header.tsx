import Link from 'next/link';

import LogoSvg from '@/components/icons/LogoSvg';
import { SiteHeaderActions, SiteNavLinks } from '@/components/site/site-nav';
import { createClient } from '@/utils/supabase/server';

/**
 * BCS/Site header (Figma 2:205): brand, a flat nav (About · Programs ·
 * Fundraisers · Get help · Contact), Member sign in, and Donate as the one
 * primary action. Signed-in visitors see My account instead of sign in.
 */
export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const account = user
    ? { label: 'My account', href: '/account' }
    : { label: 'Member sign in', href: '/signin?redirectTo=%2Faccount' };

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-[1232px] items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-md ring-offset-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/* The text below names the link; the seal is decoration here. */}
          <LogoSvg aria-hidden className="size-11 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="text-item text-foreground">BCS Seattle</span>
            <span className="hidden truncate text-caption text-muted-foreground sm:block">
              Baloch Community Services of Seattle
            </span>
          </span>
        </Link>
        <SiteNavLinks />
        <SiteHeaderActions account={account} />
      </div>
    </header>
  );
}
