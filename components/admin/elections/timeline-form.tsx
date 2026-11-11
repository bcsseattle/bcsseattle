'use client';

import * as React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/portal/panel';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { Field } from './field';
import { FormFooter } from './steps';

type Values = Record<
  | 'nomination_start'
  | 'nomination_end'
  | 'start_date'
  | 'end_date'
  | 'candidate_voting_start'
  | 'candidate_voting_end'
  | 'results_date',
  string
> & { separate: boolean };

/**
 * Step 3: nominations, voting (one window, or separate candidate and
 * initiative windows) and the results date. Values are datetime-local fields
 * read as Pacific time; windows include their start and end.
 */
export function TimelineForm({
  action,
  initial,
  hasPositions
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** datetime-local strings in Pacific time. */
  initial: Values;
  hasPositions: boolean;
}) {
  const [state, formAction] = React.useActionState(action, {});
  const v: Values = state.values
    ? { ...(state.values as unknown as Values), separate: state.values.enable_separate_voting_periods === 'on' }
    : initial;
  return <TimelineFields key={JSON.stringify(state)} formAction={formAction} state={state} v={v} hasPositions={hasPositions} />;
}

function TimelineFields({
  formAction,
  state,
  v,
  hasPositions
}: {
  formAction: (formData: FormData) => void;
  state: FormState;
  v: Values;
  hasPositions: boolean;
}) {
  const [separate, setSeparate] = React.useState(v.separate);
  const e = state.fieldErrors ?? {};
  const when = (name: keyof Values, label: string, helper?: string) => (
    <Field id={name} label={label} error={e[name]} helper={helper ?? 'Pacific time.'}>
      {(p) => <Input {...p} type="datetime-local" name={name} defaultValue={v[name] as string} />}
    </Field>
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {hasPositions ? (
        <Panel title="Nominations" subtitle="Members nominate candidates from the start to the end, both included.">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {when('nomination_start', 'Nominations open')}
            {when('nomination_end', 'Nominations close', 'Pacific time. Must be on or before voting opens.')}
          </div>
        </Panel>
      ) : (
        <p className="mt-0 text-sm text-muted-foreground">This election has no positions, so it has no nominations window.</p>
      )}

      <Panel title="Voting" subtitle="Voting opens only after you lock the ballot.">
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {when('start_date', separate ? 'Initiative voting opens' : 'Voting opens')}
          {when('end_date', separate ? 'Initiative voting closes' : 'Voting closes')}
          <div className="flex items-start gap-2 md:col-span-2">
            <Checkbox
              id="enable_separate_voting_periods"
              name="enable_separate_voting_periods"
              checked={separate}
              onCheckedChange={(c) => setSeparate(c === true)}
              aria-describedby="separate-note"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="enable_separate_voting_periods">Separate candidate voting window</Label>
              <p id="separate-note" className="mt-0 text-caption text-muted-foreground">
                Candidates and initiatives are voted on at different times.
              </p>
            </div>
          </div>
          {separate && (
            <>
              {when('candidate_voting_start', 'Candidate voting opens', 'Pacific time. Leave empty to use the voting dates.')}
              {when('candidate_voting_end', 'Candidate voting closes', 'Pacific time. Leave empty to use the voting dates.')}
            </>
          )}
        </div>
      </Panel>

      <Panel title="Results">
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {when('results_date', 'Results expected', 'Optional. Shown to members. On or after voting closes.')}
        </div>
      </Panel>

      <FormFooter error={state.error} />
    </form>
  );
}
