import * as React from 'react';
import { Calendar } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export type ElectionPhase = {
  label: string;
  tone: 'green' | 'blue' | 'orange' | 'neutral';
};

/**
 * BCS/Election card (Figma 9:1403): a phase badge with a word, type tags
 * (Leadership, Initiatives), a Title/Section title, a muted description, the
 * dates and one action. Only a "Voting open" card gets a primary action.
 */
export function ElectionCard({
  title,
  description,
  phase,
  types,
  dates,
  action,
  headingLevel: Heading = 'h2'
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  phase: ElectionPhase;
  types: string[];
  dates: React.ReactNode;
  action?: React.ReactNode;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={phase.tone}>{phase.label}</Badge>
          {types.length > 0 && (
            <div className="flex gap-1">
              {types.map((type) => (
                <Badge key={type} tone="neutral" shape="square">
                  {type}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Heading className="text-section text-foreground">{title}</Heading>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Calendar aria-hidden className="size-4" />
          {dates}
        </div>
        {action}
      </div>
    </article>
  );
}
