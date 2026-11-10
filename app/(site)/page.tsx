import Link from 'next/link';
import { AlertCircle, Banknote, FileText, Palette, Users, type LucideIcon } from 'lucide-react';

import { ProgramSummary } from '@/components/site/program-summary';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ContactForm from '@/components/ui/ctonact-form';

// Home (Figma 4:58). The mock's community photo is a placeholder with no
// image behind it, so the hero is copy only.

const PROGRAMS = [
  {
    title: 'Funeral & burial fund',
    href: '/funeral-burials',
    icon: Banknote,
    text: 'A shared community fund that helps families cover funeral and burial costs when they need it most.'
  },
  {
    title: 'Youth programs',
    href: '/youth-programs',
    icon: Palette,
    text: 'Language, culture and mentoring programs for Baloch young people across Greater Seattle.'
  },
  {
    title: 'Immigration & resources',
    href: '/resources',
    icon: FileText,
    text: 'Guides and referrals for immigration questions, citizenship prep and local services.'
  }
];

const GET_INVOLVED = [
  {
    title: 'Become a member',
    action: 'Apply',
    href: '/register',
    icon: Users,
    text: 'Members vote in BCS elections, join community funds and help shape our programs.'
  },
  {
    title: 'Give to a fundraiser',
    action: 'See fundraisers',
    href: '/fundraisers',
    icon: Banknote,
    text: 'Support community causes, from emergency relief and medical needs to education.'
  },
  {
    title: 'Get help',
    action: 'Contact us',
    href: '/contact-us',
    icon: AlertCircle,
    text: 'If you or your family need support, reach out. We will connect you with the right people.'
  }
];

function SectionHeading({ overline, title, id }: { overline: string; title: string; id?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="mt-0 text-overline uppercase text-muted-foreground">{overline}</p>
      <h2 id={id} className="font-serif text-doc-title text-foreground">
        {title}
      </h2>
    </div>
  );
}

function CardLink({ href, label, context }: { href: string; label: string; context: string }) {
  return (
    <Link href={href} className="shrink-0 text-caption font-medium text-accent underline-offset-4 hover:underline">
      {label}
      <span className="sr-only"> about {context}</span>
    </Link>
  );
}

function InfoCard({
  title,
  href,
  action,
  icon,
  text,
  muted = false
}: {
  title: string;
  href: string;
  action: string;
  icon: LucideIcon;
  text: string;
  muted?: boolean;
}) {
  return (
    <Card variant={muted ? 'muted' : 'default'} className={muted ? 'flex flex-col gap-2 p-4' : 'flex flex-col gap-3 p-4'}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={muted ? 'text-item text-foreground' : 'text-section text-foreground'}>{title}</h3>
        <CardLink href={href} label={action} context={title} />
      </div>
      <ProgramSummary icon={icon}>{text}</ProgramSummary>
    </Card>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="py-12 md:py-24">
        <div className="flex max-w-[592px] flex-col items-start gap-6">
          <p className="mt-0 text-overline uppercase text-muted-foreground">Baloch Community Services of Seattle</p>
          <h1 className="font-serif text-[2.5rem] leading-[2.875rem] tracking-[-0.01em] text-foreground md:text-hero">
            A home for Baloch culture and community in Greater Seattle
          </h1>
          <p className="mt-0 font-serif text-doc-lead text-muted-foreground">
            We organize educational programs, host cultural events and provide social services that help Baloch
            families thrive here, while keeping our traditions alive.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Become a member
            </Link>
            <Link href="#programs" className={buttonVariants({ variant: 'link', size: 'lg', className: 'no-underline hover:underline' })}>
              Explore our programs
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="programs" className="flex scroll-mt-6 flex-col gap-8 pb-16 md:pb-24">
        <SectionHeading id="programs" overline="Programs & services" title="How we support the community" />
        <div className="grid gap-6 md:grid-cols-3">
          {PROGRAMS.map((program) => (
            <InfoCard key={program.href} action="Learn more" {...program} />
          ))}
        </div>
      </section>

      {/* A full-width white band: the shadows paint past the container and
          clip-path keeps them to the band, without widening the page (BUG-050). */}
      <section
        aria-label="Mission and vision"
        className="bg-card py-16 shadow-[0_0_0_100vmax_hsl(var(--card)),0_-1px_0_100vmax_hsl(var(--border)),0_1px_0_100vmax_hsl(var(--border))] [clip-path:inset(-1px_-100vmax)] md:py-24"
      >
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col gap-4">
            <h2 className="text-overline uppercase text-muted-foreground">Our mission</h2>
            <p className="mt-0 font-serif text-doc-lead text-foreground">
              BCS Seattle aims to enhance the cultural heritage and community welfare of the Baloch community in the
              Greater Seattle area. We are committed to organizing educational programs, hosting cultural events, and
              providing social services that foster integration and well-being.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-overline uppercase text-muted-foreground">Our vision</h2>
            <p className="mt-0 font-serif text-doc-lead text-foreground">
              Our vision is to be a vibrant hub of cultural exchange and support within the Greater Seattle area, where
              the Baloch community thrives socially, educationally, and culturally — respecting traditions while
              adapting to new environments, so every member feels supported and connected.
            </p>
          </div>
        </div>
        <Link href="/about-us/bylaws" className={buttonVariants({ variant: 'link', className: 'mt-6 no-underline hover:underline' })}>
          Read our bylaws
        </Link>
      </section>

      <section className="flex flex-col gap-8 py-16 md:py-24">
        <SectionHeading overline="Get involved" title="There is a place for you here" />
        <div className="grid gap-6 md:grid-cols-3">
          {GET_INVOLVED.map((item) => (
            <InfoCard key={item.href} muted {...item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="contact" className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-4">
          <p className="mt-0 text-overline uppercase text-muted-foreground">Contact</p>
          <h2 id="contact" className="font-serif text-doc-title text-foreground">
            Send us a message
          </h2>
          <p className="mt-0 text-sm text-muted-foreground">
            We&apos;ll get back to you shortly. For urgent funeral or burial matters, say so in your message and include
            a phone number.
          </p>
        </div>
        <ContactForm compact />
      </section>
    </>
  );
}
