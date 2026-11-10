'use client';

import * as React from 'react';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { Field } from './field';

/**
 * A button that opens a confirm sheet saying exactly what will happen, then
 * runs a server action. A refusal from the server (or the database) shows in
 * the sheet; success redirects.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  run,
  tone = 'default',
  variant = 'default',
  size = 'default',
  reason
}: {
  trigger: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: string;
  run: (reason: string) => Promise<FormState | void>;
  tone?: 'default' | 'destructive';
  variant?: 'default' | 'outline' | 'destructive';
  size?: 'default' | 'sm';
  /** Asks for a reason, recorded in the activity log. */
  reason?: { label: string; helper: string };
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [text, setText] = React.useState('');
  const [pending, start] = React.useTransition();

  const confirm = () =>
    start(async () => {
      if (reason && text.trim().length < 3) {
        setError('Give a reason. It’s recorded in the activity log.');
        return;
      }
      const result = await run(text.trim());
      if (result?.error) setError(result.error);
    });

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => (setError(undefined), setOpen(true))}>
        {trigger}
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        confirmLabel={pending ? 'Working…' : confirmLabel}
        onConfirm={confirm}
        pending={pending}
        tone={tone}
        fields={
          (reason || error) && (
            <div className="flex flex-col gap-3">
              {reason && (
                <Field id="transition-reason" label={reason.label} helper={reason.helper}>
                  {(p) => <Textarea {...p} rows={3} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />}
                </Field>
              )}
              {error && (
                <Banner tone="error" title="Not done">
                  {error}
                </Banner>
              )}
            </div>
          )
        }
      >
        {description}
      </ConfirmSheet>
    </>
  );
}

export function PublishButton({ run, summary }: { run: () => Promise<FormState | void>; summary: string }) {
  return (
    <ConfirmAction
      trigger="Publish"
      title="Publish this election?"
      description={`${summary} Members will see it as Upcoming. After publishing, the type can’t change and the dates change only with Extend, which records a reason.`}
      confirmLabel="Publish election"
      run={run}
    />
  );
}

export function DeleteDraftButton({ run }: { run: () => Promise<FormState | void> }) {
  return (
    <ConfirmAction
      trigger="Delete draft"
      title="Delete this draft?"
      description="The draft, its positions and initiatives are deleted. Members never saw it. This can’t be undone."
      confirmLabel="Delete draft"
      run={run}
      tone="destructive"
      variant="destructive"
    />
  );
}

export function CancelElectionButton({ run }: { run: (reason: string) => Promise<FormState | void> }) {
  return (
    <ConfirmAction
      trigger="Cancel election"
      title="Cancel this election?"
      description="Nominations and voting stop at once and nothing is counted. Members see it as Cancelled, with your reason. This can’t be undone."
      confirmLabel="Cancel election"
      run={run}
      tone="destructive"
      variant="destructive"
      reason={{ label: 'Reason', helper: 'Members see this. It’s also recorded in the activity log.' }}
    />
  );
}
