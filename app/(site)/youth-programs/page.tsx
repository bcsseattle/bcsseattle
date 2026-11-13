import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  HandHeart,
  Mail,
  Palette,
  Users
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Youth programs | BCS Seattle',
  description:
    'Explore BCS Seattle’s focus on Balochi language, culture and mentoring for young people in Greater Seattle. Contact the team to participate or volunteer.'
};

const FOCUS_AREAS = [
  {
    title: 'Language & learning',
    icon: BookOpen,
    description:
      'Connecting young people with the Balochi language through conversation, stories and learning across generations.'
  },
  {
    title: 'Culture & creativity',
    icon: Palette,
    description:
      'Exploring Baloch heritage and traditions, making room for creative expression and a sense of belonging.'
  },
  {
    title: 'Mentoring & connection',
    icon: Users,
    description:
      'Bringing young people and community members together to share experiences, ask questions and learn from one another.'
  }
];

const PROGRAM_EMAIL =
  'mailto:info@bcsseattle.org?subject=Youth%20programs%20inquiry';
const VOLUNTEER_EMAIL =
  'mailto:info@bcsseattle.org?subject=Youth%20programs%20volunteer%20inquiry';

export default function YouthProgramsPage() {
  return (
    <div className="flex flex-col gap-12 pb-8 pt-8 lg:gap-16 lg:pt-16">
      <section aria-labelledby="youth-title" className="max-w-3xl">
        <p className="mt-0 text-overline uppercase text-muted-foreground">
          For the next generation
        </p>
        <h1 id="youth-title" className="mt-3 text-display text-foreground">
          Youth programs
        </h1>
        <p className="mt-4 font-serif text-doc-lead text-foreground">
          Rooted in Baloch culture. Growing together in Greater Seattle.
        </p>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          BCS Seattle’s youth-program focus is language, culture and mentoring:
          helping young people connect with their heritage and with the
          community around them.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={PROGRAM_EMAIL} className={buttonVariants({ size: 'lg' })}>
            <Mail aria-hidden="true" />
            Ask about youth programs
          </a>
          <Link
            href="#our-focus"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Explore our focus
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="our-focus" className="scroll-mt-6">
        <h2 id="our-focus" className="text-screen text-foreground">
          Language, culture and community
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Our priorities reflect the connections we want young people to carry
          with them as they grow.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FOCUS_AREAS.map(({ title, icon: Icon, description }) => (
            <Card key={title} className="flex flex-col gap-4 p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent-100 text-accent">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="text-section text-foreground">{title}</h3>
              <p className="mt-0 text-sm text-muted-foreground">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="take-part"
        className="grid gap-6 md:grid-cols-2"
      >
        <div className="flex flex-col items-start gap-4 py-2">
          <h2 id="take-part" className="text-screen text-foreground">
            Find out how to take part
          </h2>
          <p className="mt-0 text-body text-muted-foreground">
            Young people, parents and guardians can contact our team for current
            activities, age groups and participation details. Tell us what
            you’re interested in and what you’d like to know.
          </p>
          <a
            href={PROGRAM_EMAIL}
            className="break-all rounded-sm text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            info@bcsseattle.org
          </a>
          <p className="mt-0 text-caption text-muted-foreground">
            Email links open your email app with a subject ready to use.
          </p>
        </div>
        <Card variant="muted" className="flex flex-col items-start gap-4 p-6">
          <HandHeart aria-hidden="true" className="size-6 text-accent" />
          <h3 className="text-section text-foreground">
            Share your time and skills
          </h3>
          <p className="mt-0 text-sm text-muted-foreground">
            Interested in volunteering or mentoring? Let us know about your
            interests and experience, and ask how you can help with youth
            activities.
          </p>
          <a
            href={VOLUNTEER_EMAIL}
            className={buttonVariants({ variant: 'outline' })}
          >
            Ask about volunteering
            <ArrowRight aria-hidden="true" />
          </a>
        </Card>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="mt-0 text-sm text-muted-foreground">
          Looking for other ways BCS Seattle can help?
        </p>
        <Link href="/resources" className={buttonVariants({ variant: 'link' })}>
          Explore community resources
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
