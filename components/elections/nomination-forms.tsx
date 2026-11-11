'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import type { NominationState } from '@/utils/elections/nominations';
import { NomineeFields } from './nominee-fields';

type Action = (state: NominationState, formData: FormData) => Promise<NominationState>;
type Defaults = { full_name?: string; bio?: string; manifesto?: string };

/** Accept a nomination with your details, or decline it. */
export function RespondForm({ action, defaults }: { action: Action; defaults: Defaults }) {
  const [state, formAction] = React.useActionState(action, {});
  const v = { ...defaults, ...state.values };
  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6" noValidate>
      <NomineeFields defaults={v} />
      {state.error && (
        <Banner tone="error" title="Not sent">
          {state.error}
        </Banner>
      )}
      <Buttons
        primary={{ label: 'Accept nomination', pending: 'Accepting…', value: 'accept' }}
        secondary={{ label: 'Decline', value: 'decline' }}
      />
    </form>
  );
}

/** Change the details of a nomination you've accepted. */
export function EditNominationForm({ action, defaults, photoUrl }: { action: Action; defaults: Defaults; photoUrl: string | null }) {
  const [state, formAction] = React.useActionState(action, {});
  const v = { ...defaults, ...state.values };
  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6" noValidate>
      <NomineeFields defaults={v} photoUrl={photoUrl} />
      {state.error && (
        <Banner tone="error" title="Not saved">
          {state.error}
        </Banner>
      )}
      <Buttons primary={{ label: 'Save changes', pending: 'Saving…' }} />
    </form>
  );
}

function Buttons({
  primary,
  secondary
}: {
  primary: { label: string; pending: string; value?: string };
  secondary?: { label: string; value: string };
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" name="answer" value={primary.value} disabled={pending}>
        {pending ? primary.pending : primary.label}
      </Button>
      {secondary && (
        <Button type="submit" name="answer" value={secondary.value} variant="outline" formNoValidate disabled={pending}>
          {secondary.label}
        </Button>
      )}
    </div>
  );
}

/** Withdraw a nomination, after a sheet that says what happens. */
export function WithdrawButton({
  run,
  approved,
  mine
}: {
  run: () => Promise<NominationState | void>;
  /** An approved nomination is on the ballot: withdrawing takes it off. */
  approved: boolean;
  /** Your own nomination, rather than one you made for someone else. */
  mine: boolean;
}) {
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
        title="Withdraw this nomination?"
        confirmLabel={pending ? 'Withdrawing…' : 'Withdraw nomination'}
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
        {mine
          ? approved
            ? 'You’ll be taken off the ballot. You can be nominated again while nominations are open.'
            : 'Your nomination is withdrawn. You can be nominated again while nominations are open.'
          : 'They won’t see it any more. You can nominate them again while nominations are open.'}
      </ConfirmSheet>
    </>
  );
}
