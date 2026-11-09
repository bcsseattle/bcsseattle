import * as React from 'react';

/**
 * BCS/Gift summary (Figma 3:315): frequency, amount and purpose, a rule, then
 * the total in Figure/Price. Goes inside a Card on the donate summary.
 */
export function GiftSummary({
  frequency,
  amount,
  purpose,
  total
}: {
  frequency: React.ReactNode;
  amount: React.ReactNode;
  purpose: React.ReactNode;
  total: React.ReactNode;
}) {
  const rows = [
    ['Frequency', frequency],
    ['Amount', amount],
    ['Purpose', purpose]
  ] as const;
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="text-right font-medium text-foreground">{value}</dd>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 border-t pt-3 font-medium text-foreground">
        <dt>Total today</dt>
        <dd className="text-figure">{total}</dd>
      </div>
    </dl>
  );
}
