import { ExpenseRow } from '@/components/portal/expense-row';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/utils/format';

/** Expenses as a table of ExpenseRows (Figma 9:1426). */
export function Expenses({ expenses = [] }: { expenses: any[] }) {
  if (!expenses?.length) {
    return <p className="mt-0 px-4 py-6 text-sm text-muted-foreground">No expenses recorded yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Payee</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => (
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
