import { Banknote, BookOpen, Info, Mail, ScrollText, Shield, Target, type LucideIcon } from 'lucide-react';

export type SiteLink = { label: string; path: string; icon: LucideIcon };

/**
 * Website pages the app opens in its in-app browser, grouped as the website
 * groups them: the home page's "Programs & services", then the footer's
 * Organization, Get help and Legal columns. Donate, Fundraisers and
 * Become a member are left out because the app has its own screens for them.
 *
 * Youth programs, Immigration & resources and Get help are left out while
 * their website pages are placeholders (W5); add them back once they have content.
 */
export const PROGRAMS: SiteLink[] = [
  { label: 'Funeral & burial fund', path: '/funeral-burials', icon: Banknote },
];

export const SITE_SECTIONS: { title: string; links: SiteLink[] }[] = [
  { title: 'Programs', links: PROGRAMS },
  {
    title: 'Organization',
    links: [
      { label: 'About us', path: '/about-us', icon: Info },
      { label: 'Mission & vision', path: '/about-us/mission', icon: Target },
      { label: 'Bylaws', path: '/about-us/bylaws', icon: BookOpen }
    ]
  },
  {
    title: 'Get help',
    links: [
      { label: 'Contact us', path: '/contact-us', icon: Mail }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', path: '/privacy', icon: Shield },
      { label: 'Terms of use', path: '/terms', icon: ScrollText }
    ]
  }
];
