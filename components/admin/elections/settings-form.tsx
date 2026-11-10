'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/ui/option-card';
import { Panel } from '@/components/portal/panel';
import { RadioGroup } from '@/components/ui/radio-group';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { Field } from './field';
import { FormFooter } from './steps';

/**
 * Step 4: who can take part and how uncontested positions are shown.
 * Eligibility itself is set by the bylaws (approved members in good standing,
 * Art. III §3); the cutoff decides who is on the voter roll taken at lock.
 */
export function SettingsForm({
  action,
  initial,
  typeShowsUnopposed
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: { eligibility_cutoff: string; show_unopposed_status: 'default' | 'show' | 'hide' };
  typeShowsUnopposed: boolean;
}) {
  const [state, formAction] = React.useActionState(action, {});
  const v = { ...initial, ...state.values };
  const e = state.fieldErrors ?? {};

  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6" noValidate>
      <Panel
        title="Eligibility"
        subtitle="Approved members with an active membership can nominate, be nominated and vote (Art. III §3). One vote per membership account, Family memberships included."
      >
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field
            id="eligibility_cutoff"
            label="Membership cutoff"
            error={e.eligibility_cutoff}
            helper="Optional, Pacific time. Members who joined after this can’t vote. Empty: anyone approved and active when the ballot is locked."
          >
            {(p) => <Input {...p} type="datetime-local" name="eligibility_cutoff" defaultValue={v.eligibility_cutoff} />}
          </Field>
        </div>
      </Panel>

      <Panel title="Uncontested positions" subtitle="When a position has no more candidates than seats.">
        <div className="p-4">
          <RadioGroup name="show_unopposed_status" defaultValue={v.show_unopposed_status} aria-label="Uncontested positions">
            <OptionCard
              value="default"
              label={`Use the type’s default (${typeShowsUnopposed ? 'elect unopposed' : 'keep on the ballot'})`}
            />
            <OptionCard value="show" label="Elect them unopposed" detail="The position leaves the ballot and the results say “Elected unopposed”." />
            <OptionCard value="hide" label="Keep them on the ballot" detail="Members still vote for the candidate." />
          </RadioGroup>
          <p className="mb-0 mt-2 text-caption text-muted-foreground">You can still decide position by position when you lock the ballot.</p>
          {e.show_unopposed_status && <p className="mb-0 mt-1 text-caption text-badge-red-text">{e.show_unopposed_status}</p>}
        </div>
      </Panel>

      <FormFooter error={state.error} />
    </form>
  );
}
