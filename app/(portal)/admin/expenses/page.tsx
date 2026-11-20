import { Expenses } from '@/components/expenses';
import { PageHeader } from '@/components/portal/page-header';
import { Panel } from '@/components/portal/panel';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import dayjs from '@/libs/dayjs';
import { formatMoney } from '@/utils/format';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { expenseItems, formatExpenseItems } from '@/utils/expense-items';
import { saveExpense } from './actions';

// The admin layout already turns away anyone who isn't an admin.
export default async function AdminExpensesPage(props: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await props.searchParams;
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
  const hint = 'mt-0 text-caption text-muted-foreground';

  // ?edit=<id> (the Edit link on a row) loads that expense into the form.
  const editing = edit ? expenses?.find((e) => e.id === edit) : undefined;

  // Admin › Expenses (Figma 12:1631): the expense form (adding, or editing one), then the table.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        description="Expenses appear on the Community funds page for approved members unless you mark them private."
      />
      <Panel
        title={editing ? 'Edit expense' : 'Add expense'}
        subtitle="Amounts in USD. Category and payment method suggest values you have used before."
      >
        {/* The key gives a fresh form (new default values) when switching between adding and editing. */}
        <form id="expense-form" key={editing?.id ?? 'new'} action={saveExpense} className="grid scroll-mt-4 gap-4 p-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className={field}>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={editing?.date ?? today} required />
          </div>
          <div className={field}>
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                USD
              </span>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01"
                defaultValue={editing ? (editing.amount / 100).toFixed(2) : undefined}
                className="pl-12"
                aria-describedby="amount-hint"
              />
            </div>
            <p id="amount-hint" className={hint}>
              With a cost breakdown, the amount is its total and this is ignored.
            </p>
          </div>
          <div className={field}>
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" list="expense-categories" maxLength={50} defaultValue={editing?.category} required />
            <datalist id="expense-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className={field}>
            <Label htmlFor="payee">Payee</Label>
            <Input id="payee" name="payee" maxLength={100} defaultValue={editing?.payee ?? undefined} />
          </div>
          <div className={field}>
            <Label htmlFor="payment_method">Payment method</Label>
            <Input id="payment_method" name="payment_method" list="expense-methods" maxLength={50} defaultValue={editing?.payment_method ?? undefined} />
            <datalist id="expense-methods">
              {methods.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className={`${field} md:col-span-2`}>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" maxLength={2000} defaultValue={editing?.description ?? undefined} />
          </div>
          <div className={field}>
            <Label htmlFor="items">Cost breakdown (optional)</Label>
            <Textarea
              id="items"
              name="items"
              rows={8}
              className="font-mono"
              placeholder={'Venue:\nVenue Rental Room 1  575.00\nDeposit refund  -200\nCatering:\nKabob Korner  1,500.00'}
              defaultValue={editing ? formatExpenseItems(expenseItems(editing.items)) : undefined}
              aria-describedby="items-hint"
            />
            <p id="items-hint" className={hint}>
              For an event: one item per line, ending in its amount. You can paste two columns straight from a spreadsheet. A line
              ending in a colon starts a group with its own subtotal. The row opens to show these.
            </p>
          </div>
          <div className={field}>
            <Label htmlFor="income">Event income (optional)</Label>
            <Textarea
              id="income"
              name="income"
              rows={8}
              className="font-mono"
              placeholder={'Ticket Tailor, 31 tickets  2,170.00\nStripe, 2 tickets  140.00\nIn person, 2 tickets  110.00\nTicket fees  -78.99'}
              defaultValue={editing ? formatExpenseItems(expenseItems(editing.income)) : undefined}
              aria-describedby="income-hint"
            />
            <p id="income-hint" className={hint}>
              Ticket sales and anything else the event brought in, in the same format. Shown with the costs and the net; it does not
              change the expense&rsquo;s amount or the fund totals.
            </p>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input id="is_private" name="is_private" type="checkbox" defaultChecked={editing?.is_private} className="size-4 rounded-sm accent-[hsl(var(--accent))]" />
            <Label htmlFor="is_private" className="text-sm">
              Private (visible to admins only)
            </Label>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Button type="submit">{editing ? 'Save changes' : 'Add expense'}</Button>
            {editing && (
              <Button asChild variant="ghost">
                <Link href="/admin/expenses">Cancel</Link>
              </Button>
            )}
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
            <Expenses expenses={expenses} editable />
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
