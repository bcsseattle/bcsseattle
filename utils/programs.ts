/**
 * BCS programs, as the website's home page lists them and the app shows them
 * as its own screens. Client-safe. The words are the website's; there is no
 * more content for a program than this until the board writes it (P11).
 */

export type ProgramKey = 'funeral' | 'youth' | 'immigration';

export const PROGRAMS: { key: ProgramKey; title: string; webPath: string; summary: string }[] = [
  {
    key: 'funeral',
    title: 'Funeral & burial fund',
    webPath: '/funeral-burials',
    summary: 'A shared community fund that helps families cover funeral and burial costs when they need it most.'
  },
  {
    key: 'youth',
    title: 'Youth programs',
    webPath: '/youth-programs',
    summary: 'Language, culture and mentoring programs for Baloch young people across Greater Seattle.'
  },
  {
    key: 'immigration',
    title: 'Immigration & resources',
    webPath: '/resources',
    summary: 'Guides and referrals for immigration questions, citizenship prep and local services.'
  }
];

export const programByKey = (key: string | null | undefined) => PROGRAMS.find((p) => p.key === key);

/** The immigration guides, written in Notion (slugs) and shown to active members. */
export const IMMIGRATION_GUIDES = [
  { slug: 'asylum', title: 'Asylum Resources', image: '/asylum-officer.jpeg', membersOnly: true },
  { slug: 'citizenship', title: 'Citizenship Preparation', image: '/citizenship-prep.jpeg', membersOnly: false },
  { slug: 'support-organizations', title: 'Support Organizations', image: '/immigation-support-organizations.jpeg', membersOnly: false }
] as const;

export const guideBySlug = (slug: string | null | undefined) => IMMIGRATION_GUIDES.find((g) => g.slug === slug);

/** The opening words of the immigration resources page. */
export const IMMIGRATION_INTRO =
  'The U.S. immigration process can be incredibly complex and difficult to navigate. With numerous rules, regulations, and procedures, it’s easy to feel overwhelmed. While each person’s journey is unique, the following resources might be helpful in addressing some of the common challenges faced during the process.';

export const SUPPORT_EMAIL = 'info@bcsseattle.org';
