'use client';

import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ChevronRight, HandHeart, Mail } from 'lucide-react';
import { ListGroup } from '@/components/portal/list-row';
import { Banner } from '@/components/ui/banner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';
import { FuneralFundFormSchema } from '@/types';
import { IMMIGRATION_GUIDES, IMMIGRATION_INTRO, YOUTH, programByKey } from '@/utils/programs';
import { Screen, Section } from '~/components/screen';
import { MembersOnly } from '~/components/home/membership';
import { api } from '~/lib/api';
import { useMember } from '~/lib/member';

/**
 * A BCS program, in the app rather than the website: the funeral and burial
 * fund (with its sign-up), youth programs, and immigration & resources (with
 * its guides). The words are the website's (utils/programs.ts).
 */
export default function ProgramScreen() {
  const program = programByKey(useSearchParams().get('key'));
  return (
    <Screen title={program?.title ?? 'Program'} back={{}}>
      {!program ? (
        <StatePanel title="This program wasn’t found" />
      ) : (
        <>
          <p className="px-1 text-body text-muted-foreground">{program.summary}</p>
          {program.key === 'funeral' && <FuneralSignUp />}
          {program.key === 'youth' && <Youth />}
          {program.key === 'immigration' && <Guides />}
        </>
      )}
    </Screen>
  );
}

/** Youth programs, as the website's /youth-programs page (utils/programs.ts). */
function Youth() {
  return (
    <>
      <div className="flex flex-col gap-2 px-1">
        <p className="text-overline uppercase text-muted-foreground">{YOUTH.eyebrow}</p>
        <p className="font-serif text-doc-lead text-foreground">{YOUTH.tagline}</p>
        <p className="text-body text-muted-foreground">{YOUTH.intro}</p>
      </div>
      <a href={YOUTH.askEmail} className={buttonVariants({ size: 'lg', className: 'w-full' })}>
        <Mail aria-hidden className="size-4" />
        Ask about youth programs
      </a>
      <Section label={YOUTH.focusTitle}>
        <p className="px-1 text-body text-muted-foreground">{YOUTH.focusIntro}</p>
        <div className="flex flex-col gap-2">
          {YOUTH.focusAreas.map(({ title, icon: Icon, description }) => (
            <div key={title} className="flex gap-3 rounded-lg border bg-card p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent">
                <Icon aria-hidden className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-section text-foreground">{title}</h3>
                <p className="text-caption text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section label={YOUTH.takePartTitle}>
        <p className="px-1 text-body text-muted-foreground">{YOUTH.takePart}</p>
      </Section>
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-muted p-4">
        <HandHeart aria-hidden className="size-6 text-accent" />
        <h2 className="text-section text-foreground">{YOUTH.volunteerTitle}</h2>
        <p className="text-caption text-muted-foreground">{YOUTH.volunteer}</p>
        <a href={YOUTH.volunteerEmail} className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>
          Ask about volunteering
        </a>
      </div>
    </>
  );
}

/** The immigration guides, for active members (as on the website). */
function Guides() {
  return (
    <MembersOnly>
      {() => (
        <>
          <p className="px-1 text-body text-foreground">{IMMIGRATION_INTRO}</p>
          <ListGroup>
            <ul aria-label="Guides">
              {IMMIGRATION_GUIDES.map((g) => (
                <li key={g.slug} className="border-b last:border-b-0">
                  <Link
                    href={`/programs/guide/?slug=${g.slug}`}
                    className="flex min-h-14 items-center justify-between gap-3 py-1.5 pl-4 pr-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5 py-1">
                      <span className="text-body text-foreground">{g.title}</span>
                      <span className="text-caption text-muted-foreground">{g.description}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </ListGroup>
        </>
      )}
    </MembersOnly>
  );
}

const SERVICES = ['Yes', 'No', 'Not sure'] as const;

/** The funeral and burial fund survey, as on /funeral-burials, filled in from the member's account. */
function FuneralSignUp() {
  const { data: me } = useMember();
  const ids = { name: useId(), email: useId(), phone: useId(), services: useId(), comments: useId() };
  const [services, setServices] = useState<(typeof SERVICES)[number]>('Yes');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done)
    return (
      <StatePanel icon={CheckCircle} title="Successfully signed up!">
        Your response has been recorded.
      </StatePanel>
    );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      fullName: String(form.get('fullName') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phoneNumber: String(form.get('phoneNumber') ?? '').trim(),
      additionalServices: services,
      additionalComments: String(form.get('additionalComments') ?? '').trim() || undefined
    };
    const parsed = FuneralFundFormSchema.safeParse(values);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(undefined);
    setPending(true);
    try {
      await api('/api/app/funeral-interest', { json: parsed.data });
      setDone(true);
    } catch (e) {
      setError(e instanceof TypeError ? 'Something went wrong. Check your connection and try again.' : (e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-section text-foreground">Funeral & burial fund survey</h2>
        <p className="text-caption text-muted-foreground">
          Please fill out this form to show your interest in getting dedicated grave lots at the cemetery. We want to get a
          sense of how many people are interested and how much each of us will need to contribute.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.name}>Full name</Label>
        <Input id={ids.name} name="fullName" className="h-11" autoComplete="name" defaultValue={me?.fullName ?? ''} key={me?.fullName ?? ''} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.email}>Email</Label>
        <Input id={ids.email} name="email" type="email" inputMode="email" className="h-11" autoComplete="email" defaultValue={me?.email ?? ''} key={me?.email ?? ''} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.phone}>Phone</Label>
        <Input
          id={ids.phone}
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          className="h-11"
          autoComplete="tel"
          defaultValue={me?.member?.phone ?? ''}
          key={me?.member?.phone ?? ''}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend id={ids.services} className="mb-1.5 text-sm font-medium">
          Should it include burial expenses and optional services?
        </legend>
        <RadioGroup
          aria-labelledby={ids.services}
          value={services}
          onValueChange={(v) => setServices(v as (typeof SERVICES)[number])}
          className="gap-2"
        >
          {SERVICES.map((s) => (
            <OptionCard key={s} value={s} label={s} />
          ))}
        </RadioGroup>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.comments}>
          Additional comments <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id={ids.comments} name="additionalComments" rows={3} />
      </div>
      {error && (
        <Banner tone="error" title="Not sent">
          {error}
        </Banner>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Sign up'}
      </Button>
    </form>
  );
}
