'use client';

import { useState, type ReactNode } from 'react';
import { ListGroup } from '@/components/portal/list-row';
import { MoneyList } from '@/components/portal/money-row';
import { Button } from '@/components/ui/button';

const FIRST = 10;

/** A MoneyList in a card that shows the first 10 rows and a "Show all" for the rest (a month can hold hundreds). */
export function CappedMoneyList<T>({
  label,
  items,
  row
}: {
  label: string;
  items: T[];
  row: (item: T) => ReactNode;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, FIRST);
  return (
    <div className="flex flex-col gap-2">
      <ListGroup>
        <MoneyList label={label}>{shown.map(row)}</MoneyList>
      </ListGroup>
      {shown.length < items.length && (
        <Button
          variant="ghost"
          size="lg"
          className="text-accent"
          onClick={() => setAll(true)}
        >
          Show all {items.length}
        </Button>
      )}
    </div>
  );
}
