import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';

/**
 * BCS/Expense row (Figma 9:1426): date, category (with a "Private" tag when
 * members can't see it), payee, description and amount. A table row: use it
 * under headers Date, Category, Payee, Description, Amount.
 */
export function ExpenseRow({
  date,
  category,
  isPrivate = false,
  payee,
  description,
  amount
}: {
  date: React.ReactNode;
  category: React.ReactNode;
  isPrivate?: boolean;
  payee?: React.ReactNode;
  description?: React.ReactNode;
  amount: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">{date}</TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <span className="font-medium">{category}</span>
          {isPrivate && (
            <Badge tone="neutral" shape="square">
              Private
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell>{payee}</TableCell>
      <TableCell className="max-w-[28rem] truncate text-muted-foreground">{description}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium">{amount}</TableCell>
    </TableRow>
  );
}
