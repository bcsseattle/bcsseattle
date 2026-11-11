'use client';

import * as React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { OptionCard } from '@/components/ui/option-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/utils/cn';

export const SKIP = '';

type Candidate = { id: string; name: string; detail?: string | null; withdrawn?: boolean };

/**
 * BCS/Ballot position (Figma 10:1163): one position and its candidates (ids =
 * candidate ids, as the ballot forms use). The value is the chosen ids: none
 * yet (undefined), skipped ([]), or up to `seats` ids.
 *
 * One seat: an OptionCard per candidate plus "Skip this position", as in the
 * mock. More seats: a checkbox card per candidate, "Choose up to N", with the
 * rest disabled once N are chosen. Withdrawn candidates stay listed (B13),
 * labelled and not choosable.
 */
export function BallotPosition({
  position,
  description,
  candidates,
  seats = 1,
  value,
  onValueChange,
  headingLevel: Heading = 'h3'
}: {
  position: string;
  description?: string | null;
  candidates: Candidate[];
  seats?: number;
  value: string[] | undefined;
  onValueChange: (value: string[]) => void;
  headingLevel?: 'h2' | 'h3';
}) {
  const headingId = React.useId();
  const hintId = React.useId();
  const chosen = value ?? [];
  const detail = (c: Candidate) => (c.withdrawn ? 'Withdrawn: can’t be chosen' : (c.detail ?? undefined));

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <Heading id={headingId} className="text-section text-foreground">
          {position}
        </Heading>
        {description && <p className="mt-0 text-sm text-muted-foreground">{description}</p>}
        {seats > 1 && (
          <p id={hintId} className="mt-0 text-sm font-medium text-foreground">
            Choose up to {seats}. {chosen.length} of {seats} chosen.
          </p>
        )}
      </div>
      {seats === 1 ? (
        <RadioGroup
          aria-labelledby={headingId}
          value={value === undefined ? undefined : (chosen[0] ?? SKIP)}
          onValueChange={(v) => onValueChange(v === SKIP ? [] : [v])}
          className="gap-2"
        >
          {candidates.map((c) => (
            <OptionCard key={c.id} id={c.id} value={c.id} label={c.name} detail={detail(c)} disabled={c.withdrawn} />
          ))}
          <OptionCard value={SKIP} label="Skip this position" detail="Leave this position blank" />
        </RadioGroup>
      ) : (
        <div role="group" aria-labelledby={headingId} aria-describedby={hintId} className="grid gap-2">
          {candidates.map((c) => {
            const checked = chosen.includes(c.id);
            const disabled = c.withdrawn || (!checked && chosen.length >= seats);
            return (
              <label
                key={c.id}
                htmlFor={c.id}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-md border border-input bg-card px-4 py-3 transition-colors hover:bg-muted/60',
                  checked && 'border-accent bg-accent-100',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <Checkbox
                  id={c.id}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(on) => onValueChange(on ? [...chosen, c.id] : chosen.filter((id) => id !== c.id))}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  {detail(c) && <span className="text-caption text-muted-foreground">{detail(c)}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
