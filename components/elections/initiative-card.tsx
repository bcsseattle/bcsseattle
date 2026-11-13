'use client';

import * as React from 'react';

import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { APPROVAL_OPTIONS, type InitiativeResponseOption } from '@/utils/elections/initiative-options';

export type InitiativeVote = string;

// Labels from the mock; the values are the vote_option enum (BUG-052).
export const INITIATIVE_CHOICES = APPROVAL_OPTIONS;

/**
 * BCS/Initiative card (Figma 10:1192, mobile 13:2135): an initiative and
 * Support / Oppose / Abstain as OptionCards: three across from md, stacked
 * below. `optionId` keeps the ids the ballot forms already use.
 */
export function InitiativeCard({
  title,
  description,
  moreInfoUrl,
  options = INITIATIVE_CHOICES,
  value,
  onValueChange,
  optionId,
  headingLevel: Heading = 'h3'
}: {
  title: string;
  description?: string | null;
  moreInfoUrl?: string | null;
  options?: InitiativeResponseOption[];
  value: InitiativeVote | undefined;
  onValueChange: (value: InitiativeVote) => void;
  optionId?: (value: InitiativeVote) => string;
  headingLevel?: 'h2' | 'h3';
}) {
  const headingId = React.useId();
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <Heading id={headingId} className="text-item text-foreground">
          {title}
        </Heading>
        {description && <p className="mt-0 text-sm text-muted-foreground">{description}</p>}
        {moreInfoUrl && (
          <a
            href={moreInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline underline-offset-4"
          >
            More about this initiative<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      <RadioGroup
        aria-labelledby={headingId}
        value={value}
        onValueChange={(v) => onValueChange(v as InitiativeVote)}
        className="grid gap-2 md:grid-cols-3"
      >
        {options.map((choice) => (
          <OptionCard
            key={choice.value}
            id={optionId?.(choice.value)}
            value={choice.value}
            label={choice.label}
            detail={choice.detail ?? ''}
          />
        ))}
      </RadioGroup>
    </section>
  );
}
