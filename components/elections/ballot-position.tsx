'use client';

import * as React from 'react';

import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';

export const SKIP = '';

/**
 * BCS/Ballot position (Figma 10:1163): one position, an OptionCard per
 * candidate (id = candidate id, as the ballot forms use) and "Skip this
 * position" (value ''). The group is named by the position's heading.
 */
export function BallotPosition({
  position,
  description,
  candidates,
  value,
  onValueChange,
  headingLevel: Heading = 'h3'
}: {
  position: string;
  description?: string | null;
  candidates: { id: string; name: string; detail?: string | null }[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  headingLevel?: 'h2' | 'h3';
}) {
  const headingId = React.useId();
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <Heading id={headingId} className="text-section text-foreground">
          {position}
        </Heading>
        {description && <p className="mt-0 text-sm text-muted-foreground">{description}</p>}
      </div>
      <RadioGroup aria-labelledby={headingId} value={value} onValueChange={onValueChange} className="gap-2">
        {candidates.map((candidate) => (
          <OptionCard
            key={candidate.id}
            id={candidate.id}
            value={candidate.id}
            label={candidate.name}
            detail={candidate.detail ?? undefined}
          />
        ))}
        <OptionCard value={SKIP} label="Skip this position" detail="Leave this position blank" />
      </RadioGroup>
    </section>
  );
}
