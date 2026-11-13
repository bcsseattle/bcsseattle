import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  HandHeart,
  HeartHandshake,
  LockKeyhole,
  Mail,
  Users,
  type LucideIcon
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Resources | BCS Seattle',
  description:
    'Find BCS Seattle immigration guides, youth programs, funeral and burial fund information, and ways to contact the community team.'
};

const IMMIGRATION_GUIDES = [
  {
    title: 'Asylum resources',
    description:
      'Find the community’s collection of information about the asylum process.',
    href: '/resources/immigration/asylum',
    icon: FileText
  },
  {
    title: 'Citizenship preparation',
    description: 'Explore resources for preparing for U.S. citizenship.',
    href: '/resources/immigration/citizenship',
    icon: BookOpen
  },
  {
    title: 'Support organizations',
    description:
      'Browse organizations listed in our immigration resource collection.',
    href: '/resources/immigration/support-organizations',
    icon: HeartHandshake
  }
];

const COMMUNITY_RESOURCES = [
  {
    title: 'Youth programs',
    description:
      'Learn about our focus on language, culture and mentoring, and ask how to take part or volunteer.',
    href: '/youth-programs',
    icon: Users
  },
  {
    title: 'Funeral & burial fund',
    description:
      'Read about the community fund and the form for expressing interest in the burial program.',
    href: '/funeral-burials',
    icon: HandHeart
  },
  {
    title: 'Account & membership support',
    description:
      'Contact the BCS Seattle team for help with your account, membership, contributions or the app.',
    href: '/support',
    icon: Mail
  }
];

function ResourceCard({
  title,
  description,
  href,
  icon: Icon,
  action
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  action: string;
}) {
  return (
    <Card className="h-full">
      <Link
        href={href}
        className="group flex h-full flex-col items-start gap-4 rounded-lg p-6 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Icon aria-hidden="true" className="size-5 text-accent" />
        <h3 className="text-section text-foreground">{title}</h3>
        <p className="mt-0 flex-1 text-sm text-muted-foreground">
          {description}
        </p>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-accent group-hover:underline group-hover:underline-offset-4">
          {action}
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      </Link>
    </Card>
  );
}

export default function ResourcesPage() {
  return (
    <div className="flex flex-col gap-12 pb-8 pt-8 lg:gap-16 lg:pt-16">
      <section aria-labelledby="resources-title" className="max-w-3xl">
        <p className="mt-0 text-overline uppercase text-muted-foreground">
          Information & connection
        </p>
        <h1 id="resources-title" className="mt-3 text-display text-foreground">
          Resources for our community
        </h1>
        <p className="mt-4 font-serif text-doc-lead text-foreground">
          A starting point for immigration information, community programs and
          support from BCS Seattle.
        </p>
      </section>

      <section aria-labelledby="community-resources">
        <h2 id="community-resources" className="text-screen text-foreground">
          Community programs & support
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Explore these public pages to learn about our programs or get in touch
          with the team.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {COMMUNITY_RESOURCES.map((resource) => (
            <ResourceCard
              key={resource.href}
              {...resource}
              action="Learn more"
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="immigration-resources">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="immigration-resources"
            className="text-screen text-foreground"
          >
            Immigration guides
          </h2>
          <Badge tone="neutral">
            <LockKeyhole aria-hidden="true" />
            Member access
          </Badge>
        </div>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          These guides require sign-in and an active BCS Seattle membership.
          Already a member? Open a guide to get started.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {IMMIGRATION_GUIDES.map((resource) => (
            <ResourceCard
              key={resource.href}
              {...resource}
              action="Open guide"
            />
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          New to BCS Seattle?{' '}
          <Link
            href="/register"
            className="rounded-sm text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Learn about becoming a member
          </Link>
          .
        </p>
      </section>

      <Card
        variant="muted"
        className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      >
        <div className="max-w-2xl">
          <h2 className="text-section text-foreground">
            Not sure where to start?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Tell the BCS Seattle team what you need help with. We can help you
            find the right starting point.
          </p>
        </div>
        <Link
          href="/contact-us"
          className={buttonVariants({
            variant: 'outline',
            className: 'shrink-0'
          })}
        >
          Contact our team
          <ArrowRight aria-hidden="true" />
        </Link>
      </Card>
    </div>
  );
}
