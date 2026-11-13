import { Banknote, BookOpen, FileText, Info, Mail, Palette, ScrollText, Shield, Target, type LucideIcon } from 'lucide-react';
import { PROGRAMS as SHARED_PROGRAMS } from '@/utils/programs';

/** A website page, opened in the in-app browser; or, with `href`, one of the app's own screens. */
export type SiteLink = { label: string; path: string; icon: LucideIcon; href?: string };

const PROGRAM_ICON = { funeral: Banknote, youth: Palette, immigration: FileText };

/**
 * Website pages the app opens in its in-app browser, grouped as the website
 * groups them: the home page's "Programs & services", then the footer's
 * Organization, Get help and Legal columns. Donate, Fundraisers and
 * Become a member are left out because the app has its own screens for them.
 *
 * Programs lists every program on the website's home page, each as the app's
 * own screen (utils/programs.ts). Get help is left out while its page is
 * empty (W5).
 */
export const PROGRAMS: SiteLink[] = SHARED_PROGRAMS.map((p) => ({
  label: p.title,
  path: p.webPath,
  icon: PROGRAM_ICON[p.key],
  href: `/programs/view/?key=${p.key}`
}));

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
