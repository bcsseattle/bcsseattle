'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { formatMoney } from '@/utils/format';

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

export async function addExpense(formData: FormData) {
  // expenses has no write policy for users: admins write it with the service role.
  if (!(await isCurrentUserAdmin())) redirect('/');

  const parsed = ExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirect(getErrorRedirect('/admin/expenses', 'Expense not added.', `${issue.path.join('.')}: ${issue.message}`));
  }

  const { error } = await supabaseAdmin.from('expenses').insert(parsed.data);
  if (error) {
    console.error('addExpense:', error);
    redirect(getErrorRedirect('/admin/expenses', 'Expense not added.', 'Something went wrong. Please try again.'));
  }

  redirect(getStatusRedirect('/admin/expenses', 'Expense added.', `${parsed.data.category}: ${formatMoney(parsed.data.amount)}`));
}
