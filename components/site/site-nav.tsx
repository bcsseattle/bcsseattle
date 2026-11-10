'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

// The flat public nav (BCS/Site header 2:205). "Programs" is the Home
// programs section: /what-we-do is still an "Under construction" stub.
export const SITE_NAV = [
  { label: 'About', href: '/about-us' },
  { label: 'Programs', href: '/#programs' },
  { label: 'Fundraisers', href: '/fundraisers' },
  { label: 'Get help', href: '/get-help' },
  { label: 'Contact', href: '/contact-us' }
];

type Account = { label: string; href: string };

const isCurrent = (pathname: string, href: string) =>
  !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));

/** Desktop links: the current section is accent (interaction colour). */
export function SiteNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {SITE_NAV.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={cn(buttonVariants({ variant: 'ghost' }), current && 'text-accent')}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Sign in (or My account), then Donate: the one primary action, except on the
 * donate pages, where Donate is Ghost so the form's own button is the primary.
 * Below lg, a Menu button opens the same links in a Sheet.
 */
export function SiteHeaderActions({ account }: { account: Account }) {
  const pathname = usePathname();
  const onDonate = pathname.startsWith('/donate');
  return (
    <div className="flex items-center gap-2">
      <Link href={account.href} className={cn(buttonVariants({ variant: 'ghost' }), 'hidden lg:inline-flex')}>
        {account.label}
      </Link>
      <Link href="/donate" className={buttonVariants({ variant: onDonate ? 'ghost' : 'default' })}>
        Donate
      </Link>
      <SiteMenu account={account} pathname={pathname} />
    </div>
  );
}

/** The phone menu (replaces BUG-050's <details> menu): a focus-trapped Sheet. */
function SiteMenu({ account, pathname }: { account: Account; pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="lg:hidden">
          <Menu aria-hidden />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(20rem,85vw)] flex-col gap-6 px-4 pt-12">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {[...SITE_NAV, account].map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <li key={link.href}>
                  {/* Closes on tap, so the next page (or its skeleton) shows at once. */}
                  <SheetClose asChild>
                    <Link
                      href={link.href}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'flex h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        current && 'bg-accent-100 text-accent'
                      )}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
