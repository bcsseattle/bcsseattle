'use client';

import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/components/ui/use-table-sort';
import { ExpenseRow } from '@/components/portal/expense-row';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/utils/format';

/** Expenses as a table of ExpenseRows (Figma 9:1426). */
export function Expenses({ expenses = [] }: { expenses: any[] }) {
  const { sortedRows, sortProps } = useTableSort(expenses, {
    date: (e) => e.date,
    category: (e) => e.category,
    payee: (e) => e.payee,
    description: (e) => e.description,
    amount: (e) => Number(e.amount ?? 0)
  });
  if (!expenses?.length) {
    return <p className="mt-0 px-4 py-6 text-sm text-muted-foreground">No expenses recorded yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead {...sortProps('date')}>Date</SortableTableHead>
          <SortableTableHead {...sortProps('category')}>Category</SortableTableHead>
          <SortableTableHead {...sortProps('payee')}>Payee</SortableTableHead>
          <SortableTableHead {...sortProps('description')}>Description</SortableTableHead>
          <SortableTableHead className="text-right" {...sortProps('amount')}>Amount</SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((expense) => (
          <ExpenseRow
            key={expense.id}
            date={expense.date ? formatDate(expense.date) : ''}
            category={expense.category}
            isPrivate={expense.is_private}
            payee={expense.payee}
            description={expense.description}
            amount={formatMoney(expense?.amount || 0)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
