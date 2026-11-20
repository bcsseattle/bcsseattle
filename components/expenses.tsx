'use client';

import Link from 'next/link';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/components/ui/use-table-sort';
import type { Tables } from '@/types_db';
import { ExpenseBreakdown } from '@/components/portal/expense-breakdown';
import { ExpenseRow } from '@/components/portal/expense-row';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/utils/format';
import { expenseItems } from '@/utils/expense-items';

/**
 * Expenses as a table of ExpenseRows (Figma 9:1426). An expense with a
 * breakdown opens to show it. `editable` (admins) adds an Edit link per row,
 * to the form on /admin/expenses.
 */
export function Expenses({ expenses = [], editable = false }: { expenses: Tables<'expenses'>[]; editable?: boolean }) {
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
          {editable && (
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((expense) => {
          const items = expenseItems(expense.items);
          const income = expenseItems(expense.income);
          return (
            <ExpenseRow
              key={expense.id}
              date={expense.date ? formatDate(expense.date) : ''}
              category={expense.category}
              isPrivate={expense.is_private}
              payee={expense.payee}
              description={expense.description}
              amount={formatMoney(expense?.amount || 0)}
              breakdown={
                items.length || income.length ? <ExpenseBreakdown items={items} income={income} cost={expense.amount} /> : undefined
              }
              action={
                editable ? (
                  <Link href={`/admin/expenses?edit=${expense.id}#expense-form`} className="text-sm font-medium underline underline-offset-4">
                    Edit<span className="sr-only"> {expense.category} expense</span>
                  </Link>
                ) : undefined
              }
            />
          );
        })}
      </TableBody>
    </Table>
  );
}
