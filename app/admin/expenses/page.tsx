import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import dayjs from '@/libs/dayjs';
import { getPriceString } from '@/utils/helpers';
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>
            Expenses appear on the Community Funds page for approved members unless marked private.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addExpense} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" list="expense-categories" maxLength={50} required />
              <datalist id="expense-categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payee">Payee</Label>
              <Input id="payee" name="payee" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment method</Label>
              <Input id="payment_method" name="payment_method" list="expense-methods" maxLength={50} />
              <datalist id="expense-methods">
                {methods.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" maxLength={2000} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input id="is_private" name="is_private" type="checkbox" className="h-4 w-4" />
              <Label htmlFor="is_private">Private (visible to admins only)</Label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Add Expense</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Could not load expenses: {error.message}</p>
          ) : expenses?.length ? (
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
                  <TableRow key={e.id}>
                    <TableCell>{e.date}</TableCell>
                    <TableCell>
                      {e.category} {e.is_private && <Badge variant="secondary">Private</Badge>}
                    </TableCell>
                    <TableCell>{e.payee}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right">{getPriceString(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
