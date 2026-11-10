import * as React from 'react';

import { PersonRow } from '@/components/ui/person-row';

/**
 * BCS/Money row (Figma 9:1427) and its compact form (13:2119): a person with
 * "type · method", the date and the amount. Below md the date joins the
 * secondary line and the row is 56px, as in the compact mock.
 */
export function MoneyRow({
  name,
  secondary,
  date,
  amount
}: {
  name: string;
  secondary: React.ReactNode;
  date: React.ReactNode;
  amount: React.ReactNode;
}) {
  return (
    <li className="flex h-14 items-center gap-3 border-b bg-card px-4 last:border-b-0 md:h-13 md:gap-4">
      <PersonRow
        className="flex-1"
        name={name}
        secondary={
          <>
            {secondary}
            <span className="md:hidden"> · {date}</span>
          </>
        }
      />
      <span className="hidden w-24 shrink-0 text-table text-muted-foreground md:block">{date}</span>
      <span className="shrink-0 text-right text-table font-medium text-foreground md:w-24">{amount}</span>
    </li>
  );
}

/** A list of MoneyRows. */
export function MoneyList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="flex flex-col">
      {children}
    </ul>
  );
}
