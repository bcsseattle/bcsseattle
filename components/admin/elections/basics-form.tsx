'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { Field } from './field';
import { FormFooter } from './steps';

const TYPES = [
  { value: 'leadership', label: 'Leadership', detail: 'Officers such as President, Vice Presidents, Secretary and Treasurer.' },
  { value: 'board', label: 'Board', detail: 'Directors, usually several seats at once (Art. V: 3 to 9 Directors).' },
  { value: 'initiative', label: 'Initiatives only', detail: 'Yes/No questions for members, with no candidates.' }
];

/** Step 1: title, description and type. On a new election, saving creates the draft. */
export function BasicsForm({
  action,
  initial,
  typeLocked,
  isNew = false
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: { title: string; description: string; type: string };
  /** The type can't change once the election is published. */
  typeLocked: boolean;
  isNew?: boolean;
}) {
  const [state, formAction] = React.useActionState(action, {});
  const v = { ...initial, ...state.values };
  const e = state.fieldErrors ?? {};

  return (
    // Remounted after each reply, so fields show what was submitted (React resets forms after an action).
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6" noValidate>
      <Field id="title" label="Title" error={e.title} helper="Members see this on the election and in notifications.">
        {(p) => <Input {...p} name="title" defaultValue={v.title} maxLength={200} required />}
      </Field>
      <Field id="description" label="Description" error={e.description} helper="Optional. What this election decides, in a sentence or two.">
        {(p) => <Textarea {...p} name="description" defaultValue={v.description} maxLength={2000} rows={3} />}
      </Field>
      <fieldset className="flex flex-col gap-2" aria-describedby={e.type ? 'type-error' : undefined}>
        <legend className="mb-1.5 text-sm font-medium">Type</legend>
        <RadioGroup name="type" defaultValue={v.type} disabled={typeLocked} aria-label="Type">
          {TYPES.map((t) => (
            <OptionCard key={t.value} value={t.value} label={t.label} detail={t.detail} />
          ))}
        </RadioGroup>
        {typeLocked && <input type="hidden" name="type" value={v.type} />}
        {typeLocked && <p className="mt-0 text-caption text-muted-foreground">The type can’t change after publishing.</p>}
        {e.type && (
          <p id="type-error" className="mt-0 text-caption text-badge-red-text">
            {e.type}
          </p>
        )}
      </fieldset>
      <FormFooter error={state.error} continueLabel={isNew ? 'Create draft' : undefined} canClose={!isNew} />
    </form>
  );
}
