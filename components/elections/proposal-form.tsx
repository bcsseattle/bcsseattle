'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Field } from '@/components/admin/elections/field';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProposalState } from '@/utils/elections/proposals';

type Values = { title: string; description: string; url: string };
type Action = (state: ProposalState, formData: FormData) => Promise<ProposalState>;

/** Sample questions a member can start from (and then make their own). */
export const SAMPLE_INITIATIVES: Values[] = [
  {
    title: 'Should BCS run a free weekly homework and tutoring club for members’ children?',
    description:
      'Volunteers would tutor students in grades 3 to 12 for two hours every Saturday at the community center, from September to June. The cost is about $1,500 a year for room hire and supplies, paid from the general fund.',
    url: ''
  },
  {
    title: 'Should BCS set aside 10% of each year’s fundraising for a member hardship fund?',
    description:
      'The fund would give one-off grants of up to $500 to members facing a sudden hardship, such as a medical emergency or job loss. Two board members would approve each grant, and the board would report the total given each year without naming anyone.',
    url: ''
  },
  {
    title: 'Should the annual general meeting be held both in person and online?',
    description:
      'Members could join the meeting by video call and take part as if they were in the room. This changes the bylaws (Art. IV), so it needs a two-thirds vote to pass.',
    url: ''
  },
  {
    title: 'Should BCS hold a cultural festival each summer that is open to the public?',
    description:
      'A one-day festival with food, music and children’s activities in a public park, to welcome new families and raise the society’s profile. Volunteers would run it, and stall fees and sponsors would cover the cost.',
    url: ''
  }
];

/**
 * Propose an initiative question, or edit one waiting for review. A new
 * proposal can start from one of the samples.
 */
export function ProposalForm({
  action,
  defaults,
  submitLabel,
  samples = false
}: {
  action: Action;
  defaults?: Values;
  submitLabel: { idle: string; pending: string };
  /** Offer the sample questions to start from. */
  samples?: boolean;
}) {
  const [state, formAction] = React.useActionState(action, {});
  const [v, setV] = React.useState<Values>({
    title: state.values?.title ?? defaults?.title ?? '',
    description: state.values?.description ?? defaults?.description ?? '',
    url: state.values?.url ?? defaults?.url ?? ''
  });
  const titleRef = React.useRef<HTMLInputElement>(null);
  const set = (name: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((old) => ({ ...old, [name]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      {samples && (
        <section aria-labelledby="samples-heading" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <h2 id="samples-heading" className="text-section text-foreground">
              Examples
            </h2>
            <p className="mt-0 text-sm text-muted-foreground">
              A good initiative asks one yes-or-no question and says what changes if it passes, and what it costs. Start
              from an example and make it your own.
            </p>
          </div>
          <ul className="flex flex-col divide-y">
            {SAMPLE_INITIATIVES.map((s) => (
              <li key={s.title} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                  <span className="line-clamp-2 text-caption text-muted-foreground">{s.description}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setV(s);
                    titleRef.current?.focus();
                  }}
                >
                  Use this example
                  <span className="sr-only">: {s.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action={formAction} className="flex flex-col gap-6" noValidate>
        <Field id="title" label="Question" helper="One yes-or-no question, 10 to 200 characters. Members vote Yes, No or Abstain.">
          {(p) => <Input {...p} ref={titleRef} name="title" value={v.title} onChange={set('title')} maxLength={200} required />}
        </Field>
        <Field
          id="description"
          label="Explanation"
          helper="What changes if it passes, who it affects and what it costs. 20 to 2,000 characters. Members read this before they vote."
        >
          {(p) => <Textarea {...p} name="description" rows={6} value={v.description} onChange={set('description')} maxLength={2000} required />}
        </Field>
        <Field id="url" label="Link (optional)" helper="A page with more detail, such as a budget or a draft bylaw change.">
          {(p) => <Input {...p} name="url" type="url" inputMode="url" value={v.url} onChange={set('url')} placeholder="https://" />}
        </Field>
        {state.error && (
          <Banner tone="error" title="Not sent">
            {state.error}
          </Banner>
        )}
        <Submit {...submitLabel} />
      </form>
    </div>
  );
}

function Submit({ idle, pending }: { idle: string; pending: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <div>
      <Button type="submit" disabled={busy}>
        {busy ? pending : idle}
      </Button>
    </div>
  );
}

/** Withdraw a proposal, after a sheet that says what happens. */
export function WithdrawProposalButton({ run, approved }: { run: () => Promise<ProposalState | void>; approved: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, start] = React.useTransition();
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => (setError(undefined), setOpen(true))}>
        Withdraw
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title="Withdraw this proposal?"
        confirmLabel={pending ? 'Withdrawing…' : 'Withdraw proposal'}
        tone="destructive"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const r = await run();
            if (r?.error) setError(r.error);
          })
        }
        fields={
          error && (
            <Banner tone="error" title="Not withdrawn">
              {error}
            </Banner>
          )
        }
      >
        {approved
          ? 'The question comes off the ballot. You can propose it again while nominations are open.'
          : 'The admins won’t review it. You can propose it again while nominations are open.'}
      </ConfirmSheet>
    </>
  );
}
