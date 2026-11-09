import Link from 'next/link';

import LogoSvg from '@/components/icons/LogoSvg';

const COLUMNS = [
  {
    title: 'Organization',
    links: [
      { label: 'About us', href: '/about-us' },
      { label: 'Mission & vision', href: '/about-us/mission' },
      { label: 'Bylaws', href: '/about-us/bylaws' },
      { label: 'Contact us', href: '/contact-us' }
    ]
  },
  {
    title: 'Get involved',
    links: [
      { label: 'Become a member', href: '/register' },
      { label: 'Donate', href: '/donate' },
      { label: 'Fundraisers', href: '/fundraisers' },
      { label: 'Get help', href: '/get-help' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of use', href: '/terms' }
    ]
  }
];

/** BCS/Site footer (Figma 2:244). */
export default function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-[1232px] flex-col gap-10 px-4 pb-8 pt-12">
        <div className="flex flex-col gap-10 md:flex-row md:gap-12">
          <div className="flex flex-1 flex-col gap-3">
            <LogoSvg aria-hidden className="size-16" />
            <div className="text-item text-foreground">Baloch Community Services of Seattle</div>
            <div className="max-w-sm text-sm text-muted-foreground">
              Educational programs, cultural events and social services for the Baloch community in Greater
              Seattle.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:flex md:gap-12">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title} className="md:w-[200px]">
                <h2 className="text-overline uppercase text-muted-foreground">{column.title}</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="text-caption text-muted-foreground">
          © {new Date().getFullYear()} Baloch Community Services of Seattle · 501(c)(3) nonprofit · EIN 99-2495973
        </div>
      </div>
    </footer>
  );
}
