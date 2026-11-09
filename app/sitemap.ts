import type { MetadataRoute } from 'next';
import { getURL } from '@/utils/helpers';

// The public pages (BUG-054). Member-only pages are left out: crawlers can't open them.
const pages = [
  '/',
  '/about-us',
  '/about-us/mission',
  '/about-us/vision',
  '/about-us/bylaws',
  '/what-we-do',
  '/get-involved',
  '/get-help',
  '/youth-programs',
  '/funeral-burials',
  '/resources',
  '/resources/immigration',
  '/donate',
  '/fundraisers',
  '/contact-us',
  '/privacy',
  '/terms'
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((path) => ({ url: getURL(path) }));
}
