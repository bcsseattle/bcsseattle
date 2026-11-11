'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TransactionStep, TransactionSteps } from '@/components/ui/transaction-step';
import { cn } from '@/utils/cn';

import { STEPS, type StepKey } from './step-list';

/**
 * The create/edit steps as a TransactionStep row: steps before the current one
 * are done, and every step of a saved draft is a link (the draft is saved as
 * you go, so moving between steps loses nothing that was saved).
 */
export function StepNav({
  current,
  electionId,
  keys = STEPS.map((s) => s.key)
}: {
  current: StepKey;
  electionId?: string;
  /** The steps on offer (editableSteps); all of them for a draft. */
  keys?: StepKey[];
}) {
  const steps = STEPS.filter((s) => keys.includes(s.key));
  const at = steps.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Election setup steps">
      <TransactionSteps>
        {steps.map((s, i) => {
          const state = i < at ? 'done' : i === at ? 'current' : 'upcoming';
          const label =
            electionId && i !== at ? (
              <Link href={`/admin/elections/${electionId}/edit?step=${s.key}`} className="underline-offset-2 hover:underline">
                {s.label}
              </Link>
            ) : (
              <span aria-current={i === at ? 'step' : undefined}>{s.label}</span>
            );
          return <TransactionStep key={s.key} state={state} label={label} detail={`Step ${i + 1} of ${steps.length}`} />;
        })}
      </TransactionSteps>
    </nav>
  );
}

/** The form's error banner and its two buttons: continue (primary) and save and go to the overview. */
export function FormFooter({ error, continueLabel = 'Save and continue', canClose = true }: { error?: string; continueLabel?: string; canClose?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Banner tone="error" title="Not saved">
          {error}
        </Banner>
      )}
      <div className={cn('flex flex-wrap gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : continueLabel}
        </Button>
        {canClose && (
          <Button type="submit" name="then" value="overview" variant="outline" disabled={pending}>
            Save and close
          </Button>
        )}
      </div>
    </div>
  );
}
