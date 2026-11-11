'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { NomineeFields } from '@/components/elections/nominee-fields';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { ConfirmAction } from './transition-buttons';
import { Field } from './field';

/** Approve (the nominee goes on the ballot) or reject with a reason the nominee sees. */
export function ReviewButtons({
  approve,
  reject,
  nominee,
  position,
  canApprove
}: {
  approve: () => Promise<FormState | void>;
  reject: (reason: string) => Promise<FormState | void>;
  nominee: string;
  position: string;
  /** Only a nomination the nominee has accepted can be approved. */
  canApprove: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canApprove && (
        <ConfirmAction
          trigger="Approve"
          size="sm"
          title={`Approve ${nominee}?`}
          description={`${nominee} goes on the ballot for ${position}, with the name, statement and photo they gave. You can still fix those until the ballot is locked.`}
          confirmLabel="Approve nomination"
          run={() => approve()}
        />
      )}
      <ConfirmAction
        trigger="Reject"
        size="sm"
        variant="outline"
        tone="destructive"
        title={`Don’t approve ${nominee}?`}
        description={`${nominee} won’t be on the ballot for ${position}. They see your reason under My nominations.`}
        confirmLabel="Reject nomination"
        run={reject}
        reason={{ label: 'Reason', helper: 'The nominee sees this. It’s also in the activity log.' }}
      />
    </div>
  );
}

/** Approve an initiative proposal (it joins the ballot) or reject it with a reason the member sees. */
export function ProposalReviewButtons({
  approve,
  reject,
  title
}: {
  approve: () => Promise<FormState | void>;
  reject: (reason: string) => Promise<FormState | void>;
  title: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        trigger="Approve"
        size="sm"
        title="Put this question on the ballot?"
        description={`“${title}” goes on the ballot, passing with more Yes than No. You can change its wording, or make it need two-thirds (for a bylaw change), under Ballot until the lock.`}
        confirmLabel="Approve initiative"
        run={() => approve()}
      />
      <ConfirmAction
        trigger="Reject"
        size="sm"
        variant="outline"
        tone="destructive"
        title="Don’t put this question on the ballot?"
        description={`“${title}” won’t be on the ballot. The member sees your reason.`}
        confirmLabel="Reject initiative"
        run={reject}
        reason={{ label: 'Reason', helper: 'The member sees this. It’s also in the activity log.' }}
      />
    </div>
  );
}

/** Fix a candidate's name, statement or photo (logged; allowed after the lock too). */
export function EditCandidate({
  action,
  candidate
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  candidate: { id: string; full_name: string; bio: string | null; manifesto: string | null; photo_url: string | null };
}) {
  const [state, formAction] = React.useActionState(action, {});
  return (
    <details className="group" open={!!state.error}>
      <summary className="cursor-pointer text-sm underline underline-offset-2">Fix name, statement or photo</summary>
      <form key={JSON.stringify(state)} action={formAction} className="mt-3 flex flex-col gap-4" noValidate>
        <NomineeFields
          defaults={{ full_name: state.values?.full_name ?? candidate.full_name, bio: state.values?.bio ?? candidate.bio ?? '', manifesto: state.values?.manifesto ?? candidate.manifesto ?? '' }}
          photoUrl={candidate.photo_url}
          idPrefix={`candidate-${candidate.id}-`}
        />
        {state.error && (
          <Banner tone="error" title="Not saved">
            {state.error}
          </Banner>
        )}
        <Submit label="Save candidate" />
      </form>
    </details>
  );
}

/** Add a candidate directly: a member, or a name only. */
export function AddCandidateForm({
  action,
  positions,
  members
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  positions: { id: string; title: string }[];
  members: { user_id: string; full_name: string }[];
}) {
  const [state, formAction] = React.useActionState(action, {});
  const v = state.values ?? {};
  const select = 'h-10 w-full rounded-md border border-input bg-card px-3 text-sm';
  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-4 p-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="add-position" label="Position">
          {(p) => (
            <select {...p} name="position" className={select} defaultValue={v.position ?? positions[0]?.id}>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="add-member" label="Member" helper="Leave as “Name only” for someone without a member account.">
          {(p) => (
            <select {...p} name="member" className={select} defaultValue={v.member ?? ''}>
              <option value="">Name only</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <NomineeFields defaults={{ full_name: v.full_name, bio: v.bio, manifesto: v.manifesto }} idPrefix="add-" />
      {state.error && (
        <Banner tone="error" title="Not added">
          {state.error}
        </Banner>
      )}
      <Submit label="Add candidate" />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : label}
      </Button>
    </div>
  );
}
