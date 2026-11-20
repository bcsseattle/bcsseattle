'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { formatMoney } from '@/utils/format';
import { parseExpenseItems, sumExpenseItems } from '@/utils/expense-items';

const optional = (max: number) =>
  z.string().trim().max(max).transform((v) => v || null);

const ExpenseSchema = z.object({
  date: z.string().date(),
  // Entered in dollars, stored in cents like the existing rows (Community Funds divides by 100).
  amount: z.coerce
    .number()
    .positive()
    .multipleOf(0.01)
    .max(999_999.99)
    .transform((dollars) => Math.round(dollars * 100)),
  category: z.string().trim().min(1).max(50),
  payee: optional(100),
  payment_method: optional(50),
  description: optional(2000),
  is_private: z.literal('on').optional().transform(Boolean)
});

/** Adds an expense, or saves changes to the one named by the form's `id`. */
export async function saveExpense(formData: FormData) {
  // expenses has no write policy for users: admins write it with the service role.
  if (!(await isCurrentUserAdmin())) redirect('/');

  const id = z.string().uuid().safeParse(formData.get('id')).data;
  const failed = id ? 'Expense not updated.' : 'Expense not added.';
  const fail = (reason: string): never => redirect(getErrorRedirect('/admin/expenses', failed, reason));

  // Optional breakdowns, one "item amount" per line: what the event cost, and what it brought in.
  const [costs, income] = (['items', 'income'] as const).map((name) => parseExpenseItems(String(formData.get(name) ?? '')));
  const bad = [...costs.bad, ...income.bad];
  if (bad.length) fail(`No amount found on this breakdown line: "${bad[0].slice(0, 80)}". A group heading ends with a colon.`);
  if (costs.items.length > 100 || income.items.length > 100) fail('A breakdown can have up to 100 items.');

  // With a cost breakdown, the expense's amount is its total.
  const fields = Object.fromEntries(formData);
  if (costs.items.length) fields.amount = String(sumExpenseItems(costs.items) / 100);

  const parsed = ExpenseSchema.safeParse(fields);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`${issue.path.join('.')}: ${issue.message}`);
  }

  const row = { ...parsed.data, items: costs.items.length ? costs.items : null, income: income.items.length ? income.items : null };
  const { error } = id
    ? await supabaseAdmin.from('expenses').update(row).eq('id', id)
    : await supabaseAdmin.from('expenses').insert(row);
  if (error) {
    console.error('saveExpense:', error);
    fail('Something went wrong. Please try again.');
  }

  redirect(
    getStatusRedirect('/admin/expenses', id ? 'Expense updated.' : 'Expense added.', `${parsed.data.category}: ${formatMoney(parsed.data.amount)}`)
  );
}
