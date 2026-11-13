import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, HandHeart, Mail } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { YOUTH } from '@/utils/programs';

export const metadata: Metadata = {
  title: 'Youth programs | BCS Seattle',
  description:
    'Explore BCS Seattle’s focus on Balochi language, culture and mentoring for young people in Greater Seattle. Contact the team to participate or volunteer.'
};

// The words live in utils/programs.ts, shared with the app.

export default function YouthProgramsPage() {
  return (
    <div className="flex flex-col gap-12 pb-8 pt-8 lg:gap-16 lg:pt-16">
      <section aria-labelledby="youth-title" className="max-w-3xl">
        <p className="mt-0 text-overline uppercase text-muted-foreground">
          {YOUTH.eyebrow}
        </p>
        <h1 id="youth-title" className="mt-3 text-display text-foreground">
          Youth programs
        </h1>
        <p className="mt-4 font-serif text-doc-lead text-foreground">
          {YOUTH.tagline}
        </p>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          {YOUTH.intro}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={YOUTH.askEmail} className={buttonVariants({ size: 'lg' })}>
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
          {YOUTH.focusTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          {YOUTH.focusIntro}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {YOUTH.focusAreas.map(({ title, icon: Icon, description }) => (
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
            {YOUTH.takePartTitle}
          </h2>
          <p className="mt-0 text-body text-muted-foreground">
            {YOUTH.takePart}
          </p>
          <a
            href={YOUTH.askEmail}
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
            {YOUTH.volunteerTitle}
          </h3>
          <p className="mt-0 text-sm text-muted-foreground">
            {YOUTH.volunteer}
          </p>
          <a
            href={YOUTH.volunteerEmail}
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
