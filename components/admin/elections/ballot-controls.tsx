'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { Field } from './field';
import { ConfirmAction } from './transition-buttons';

/** A small button that runs a reversible ballot decision (vacant, elect unopposed, keep on the ballot). */
export function DecisionButton({ run, children, pressed }: { run: () => Promise<FormState | void>; children: React.ReactNode; pressed?: boolean }) {
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string>();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant={pressed ? 'default' : 'outline'}
        aria-pressed={pressed}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await run();
            if (r?.error) setError(r.error);
          })
        }
      >
        {children}
      </Button>
      {error && <span className="text-caption text-badge-red-text">{error}</span>}
    </span>
  );
}

/** Move a deadline later, with a reason (election_extend). */
export function ExtendForm({
  action,
  label,
  current,
  idPrefix
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  /** The current deadline, as a datetime-local value in Pacific time. */
  current: string;
  idPrefix: string;
}) {
  const [state, formAction] = React.useActionState(action, {});
  const v = state.values ?? {};
  return (
    <form key={JSON.stringify(state)} action={formAction} className="grid gap-4 md:grid-cols-2" noValidate>
      <Field id={`${idPrefix}-until`} label={label} error={state.fieldErrors?.until} helper="Pacific time. Later than the current deadline.">
        {(p) => <Input {...p} type="datetime-local" name="until" defaultValue={v.until ?? current} />}
      </Field>
      <Field id={`${idPrefix}-reason`} label="Reason" helper="Recorded in the activity log.">
        {(p) => <Textarea {...p} name="reason" rows={2} maxLength={500} defaultValue={v.reason} />}
      </Field>
      {state.error && (
        <div className="md:col-span-2">
          <Banner tone="error" title="Not extended">
            {state.error}
          </Banner>
        </div>
      )}
      <div className="md:col-span-2">
        <Submit label="Extend" />
      </div>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  );
}

export function LockBallotButton({ run, summary }: { run: () => Promise<FormState | void>; summary: string }) {
  return (
    <ConfirmAction
      trigger="Lock ballot"
      title="Lock the ballot?"
      description={`${summary} After this, nobody can add, remove or move anything on the ballot; only typos in a candidate’s name, statement or photo can be fixed.`}
      confirmLabel="Lock ballot"
      run={run}
    />
  );
}

export function WithdrawCandidateButton({ run, name }: { run: (reason: string) => Promise<FormState | void>; name: string }) {
  return (
    <ConfirmAction
      trigger="Mark withdrawn"
      size="sm"
      variant="outline"
      tone="destructive"
      title={`Mark ${name} withdrawn?`}
      description={`${name} stays on the ballot, labelled Withdrawn. Members can’t choose them any more and they can’t win. Votes already cast for them aren’t moved to anyone else.`}
      confirmLabel="Mark withdrawn"
      run={run}
      reason={{ label: 'Reason', helper: 'Recorded in the activity log.' }}
    />
  );
}
