'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { ConfirmAction } from './transition-buttons';

type Run = () => Promise<FormState | void>;

export function CertifyButton({ run, summary }: { run: Run; summary: string }) {
  return (
    <ConfirmAction
      trigger="Certify results"
      title="Certify these results?"
      description={`${summary} The count is frozen as it stands. Members don’t see it until you publish the results; until then you can reopen the certification.`}
      confirmLabel="Certify results"
      run={run}
    />
  );
}

export function PublishResultsButton({ run }: { run: Run }) {
  return (
    <ConfirmAction
      trigger="Publish results"
      title="Publish the results?"
      description="Members see the certified results on the website and in the app, and are told they’re out (once notifications are switched on). After this the certification can’t be reopened here."
      confirmLabel="Publish results"
      run={run}
    />
  );
}

export function ReopenCertificationButton({ run }: { run: (reason: string) => Promise<FormState | void> }) {
  return (
    <ConfirmAction
      trigger="Reopen certification"
      variant="outline"
      title="Reopen the certification?"
      description="The frozen results are removed and the election goes back to counting. You can then start a run-off or certify again."
      confirmLabel="Reopen certification"
      run={run}
      reason={{ label: 'Reason', helper: 'Recorded in the activity log.' }}
    />
  );
}

export function ArchiveButton({ run }: { run: Run }) {
  return (
    <ConfirmAction
      trigger="Archive"
      variant="outline"
      title="Archive this election?"
      description="It moves to the Archived tab. Members can still see its results."
      confirmLabel="Archive election"
      run={run}
    />
  );
}

export function StartRunoffButton({ run, position, names }: { run: Run; position: string; names: string[] }) {
  return (
    <ConfirmAction
      trigger="Start a run-off"
      size="sm"
      title={`Start a run-off for ${position}?`}
      description={`A new draft election is created with only ${names.join(' and ')} for ${position}, and the same voter roll. You set its dates and publish it; this election can be certified once the run-off is.`}
      confirmLabel="Create run-off"
      run={run}
    />
  );
}

export function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" />
      Print or save as PDF
    </Button>
  );
}
