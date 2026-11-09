import { ExpenseRow } from '@/components/portal/expense-row';
import { PageHeader } from '@/components/portal/page-header';
import { Panel } from '@/components/portal/panel';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import dayjs from '@/libs/dayjs';
import { formatDate, formatMoney } from '@/utils/format';
import { createClient } from '@/utils/supabase/server';
import { addExpense } from './actions';

// The admin layout already turns away anyone who isn't an admin.
export default async function AdminExpensesPage() {
  const supabase = await createClient();
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  const unique = (values: (string | null)[]) => Array.from(new Set(values.filter(Boolean))) as string[];
  const categories = unique((expenses ?? []).map((e) => e.category));
  const methods = unique((expenses ?? []).map((e) => e.payment_method));
  const today = dayjs().tz('America/Los_Angeles').format('YYYY-MM-DD');

  const total = (expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const field = 'flex flex-col gap-1.5';

  // Admin › Expenses (Figma 12:1631): the add-expense form, then the table.
  // The form's fields, names and limits, its action and the query are unchanged.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        description="Expenses appear on the Community funds page for approved members unless you mark them private."
      />
      <Panel title="Add expense" subtitle="Amounts in USD. Category and payment method suggest values you have used before.">
        <form action={addExpense} className="grid gap-4 p-4 md:grid-cols-2">
          <div className={field}>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>
          <div className={field}>
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                USD
              </span>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required className="pl-12" />
            </div>
          </div>
          <div className={field}>
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" list="expense-categories" maxLength={50} required />
            <datalist id="expense-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className={field}>
            <Label htmlFor="payee">Payee</Label>
            <Input id="payee" name="payee" maxLength={100} />
          </div>
          <div className={field}>
            <Label htmlFor="payment_method">Payment method</Label>
            <Input id="payment_method" name="payment_method" list="expense-methods" maxLength={50} />
            <datalist id="expense-methods">
              {methods.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className={`${field} md:col-span-2`}>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" maxLength={2000} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input id="is_private" name="is_private" type="checkbox" className="size-4 rounded-sm accent-[hsl(var(--accent))]" />
            <Label htmlFor="is_private" className="text-sm">
              Private (visible to admins only)
            </Label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add expense</Button>
          </div>
        </form>
      </Panel>
      <Panel title="All expenses" subtitle="Private expenses are tagged and hidden from members">
        {error ? (
          <div className="p-4">
            <Banner tone="error" title="Could not load expenses">
              {error.message}. Reload the page to try again.
            </Banner>
          </div>
        ) : expenses?.length ? (
          <>
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
                {expenses.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    date={e.date ? formatDate(e.date) : ''}
                    category={e.category}
                    isPrivate={!!e.is_private}
                    payee={e.payee}
                    description={e.description}
                    amount={formatMoney(e.amount)}
                  />
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-2 border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">Total, all expenses</span>
              <span className="text-table font-medium text-foreground">{formatMoney(total)}</span>
            </div>
          </>
        ) : (
          <p className="mt-0 px-4 py-6 text-sm text-muted-foreground">No expenses recorded yet.</p>
        )}
      </Panel>
    </div>
  );
}
