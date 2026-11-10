'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Field } from '@/components/admin/elections/field';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { NominationState } from '@/utils/elections/nominations';
import { NomineeFields } from './nominee-fields';

const selectClass = 'h-10 w-full rounded-md border border-input bg-card px-3 text-sm';

/**
 * Nominate yourself or another approved member for one of the election's
 * positions. Yourself: your details go straight to review. Someone else: they
 * get the nomination with your note and accept or decline it.
 */
export function NominateForm({
  action,
  positions,
  members,
  myName,
  canSelf = true
}: {
  action: (state: NominationState, formData: FormData) => Promise<NominationState>;
  positions: { id: string; title: string; description: string | null }[];
  /** Approved, active members other than you, by name. */
  members: { user_id: string; full_name: string }[];
  myName: string;
  /** False when you already stand in this election (one position each). */
  canSelf?: boolean;
}) {
  const [state, formAction] = React.useActionState(action, {});
  const v = state.values ?? {};
  const [who, setWho] = React.useState(v.who ?? (canSelf ? 'self' : 'other'));
  const [position, setPosition] = React.useState(v.position ?? positions[0]?.id ?? '');
  const description = positions.find((p) => p.id === position)?.description;

  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Who are you nominating?</legend>
        <RadioGroup name="who" value={who} onValueChange={setWho} aria-label="Who are you nominating?">
          <OptionCard
            value="self"
            label="Myself"
            disabled={!canSelf}
            detail={canSelf ? 'Your details go to the admins for review after nominations close.' : 'You’re already standing in this election.'}
          />
          <OptionCard value="other" label="Another member" detail="They’ll see it under My nominations and can accept or decline." />
        </RadioGroup>
      </fieldset>

      <Field id="position" label="Position" helper={description ?? undefined}>
        {(p) => (
          <select {...p} name="position" className={selectClass} value={position} onChange={(e) => setPosition(e.target.value)}>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.title}
              </option>
            ))}
          </select>
        )}
      </Field>

      {who === 'other' ? (
        <>
          <Field id="nominee" label="Member" helper="Approved members with an active membership.">
            {(p) => (
              <select {...p} name="nominee" className={selectClass} defaultValue={v.nominee ?? ''} required>
                <option value="" disabled>
                  Choose a member
                </option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="message" label="Note to them" helper="Optional. Why you think they should stand.">
            {(p) => <Textarea {...p} name="message" defaultValue={v.message} rows={3} maxLength={500} />}
          </Field>
        </>
      ) : (
        <NomineeFields defaults={{ full_name: v.full_name ?? myName, bio: v.bio, manifesto: v.manifesto }} />
      )}

      {state.error && (
        <Banner tone="error" title="Not sent">
          {state.error}
        </Banner>
      )}
      <Submit who={who} />
    </form>
  );
}

function Submit({ who }: { who: string }) {
  const { pending } = useFormStatus();
  return (
    <div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : who === 'self' ? 'Submit my nomination' : 'Send nomination'}
      </Button>
    </div>
  );
}
