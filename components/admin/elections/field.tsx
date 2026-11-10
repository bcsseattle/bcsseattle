import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { Label } from '@/components/ui/label';

/**
 * A labelled field (DESIGN.md Forms): label above, helper text below, and an
 * error in the helper's place, linked with aria-describedby. The control is
 * passed as a render function so it gets the ids.
 */
export function Field({
  id,
  label,
  helper,
  error,
  children
}: {
  id: string;
  label: React.ReactNode;
  helper?: React.ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => React.ReactNode;
}) {
  const noteId = `${id}-note`;
  const note = error ?? helper;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-describedby': note ? noteId : undefined, 'aria-invalid': error ? true : undefined })}
      {note && (
        <p id={noteId} className={`mt-0 flex items-start gap-1 text-caption ${error ? 'text-badge-red-text' : 'text-muted-foreground'}`}>
          {error && <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />}
          {note}
        </p>
      )}
    </div>
  );
}
