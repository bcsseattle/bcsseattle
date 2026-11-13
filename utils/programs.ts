import { BookOpen, FileText, HeartHandshake, Palette, Users } from 'lucide-react';

/**
 * BCS programs, as the website's home page lists them and the app shows them
 * as its own screens. Client-safe. Each program's words live here once, for
 * the website's pages and the app's screens.
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
  {
    slug: 'asylum',
    title: 'Asylum resources',
    description: 'Find the community’s collection of information about the asylum process.',
    icon: FileText,
    image: '/asylum-officer.jpeg',
    membersOnly: true
  },
  {
    slug: 'citizenship',
    title: 'Citizenship preparation',
    description: 'Explore resources for preparing for U.S. citizenship.',
    icon: BookOpen,
    image: '/citizenship-prep.jpeg',
    membersOnly: false
  },
  {
    slug: 'support-organizations',
    title: 'Support organizations',
    description: 'Browse organizations listed in our immigration resource collection.',
    icon: HeartHandshake,
    image: '/immigation-support-organizations.jpeg',
    membersOnly: false
  }
] as const;

/** Youth programs: the website's /youth-programs page and the app's screen. */
export const YOUTH = {
  eyebrow: 'For the next generation',
  tagline: 'Rooted in Baloch culture. Growing together in Greater Seattle.',
  intro:
    'BCS Seattle’s youth-program focus is language, culture and mentoring: helping young people connect with their heritage and with the community around them.',
  focusTitle: 'Language, culture and community',
  focusIntro: 'Our priorities reflect the connections we want young people to carry with them as they grow.',
  focusAreas: [
    {
      title: 'Language & learning',
      icon: BookOpen,
      description: 'Connecting young people with the Balochi language through conversation, stories and learning across generations.'
    },
    {
      title: 'Culture & creativity',
      icon: Palette,
      description: 'Exploring Baloch heritage and traditions, making room for creative expression and a sense of belonging.'
    },
    {
      title: 'Mentoring & connection',
      icon: Users,
      description:
        'Bringing young people and community members together to share experiences, ask questions and learn from one another.'
    }
  ],
  takePartTitle: 'Find out how to take part',
  takePart:
    'Young people, parents and guardians can contact our team for current activities, age groups and participation details. Tell us what you’re interested in and what you’d like to know.',
  volunteerTitle: 'Share your time and skills',
  volunteer:
    'Interested in volunteering or mentoring? Let us know about your interests and experience, and ask how you can help with youth activities.',
  askEmail: 'mailto:info@bcsseattle.org?subject=Youth%20programs%20inquiry',
  volunteerEmail: 'mailto:info@bcsseattle.org?subject=Youth%20programs%20volunteer%20inquiry'
};

export const guideBySlug = (slug: string | null | undefined) => IMMIGRATION_GUIDES.find((g) => g.slug === slug);

/** The opening words of the immigration resources page. */
export const IMMIGRATION_INTRO =
  'The U.S. immigration process can be incredibly complex and difficult to navigate. With numerous rules, regulations, and procedures, it’s easy to feel overwhelmed. While each person’s journey is unique, the following resources might be helpful in addressing some of the common challenges faced during the process.';
