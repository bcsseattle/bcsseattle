import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { admin, getMember } from '../support/db';
import { expect } from '../support/expect';
import { arrange } from './common.steps';
import type { E2EWorld } from '../support/world';

function rowFor(world: E2EWorld, name: string) {
  return world.page.getByRole('row').filter({ hasText: world.user(name).fullName });
}

async function openMemberManagement(world: E2EWorld) {
  if (!world.page.url().endsWith('/admin/members')) await world.page.goto('/admin/members');
  await expect(world.page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
}

/** Confirms an AlertDialog and waits for the page to show the new state. */
async function confirm(world: E2EWorld, button: string) {
  const dialog = world.page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

Given('there is an approved member named {string} whose membership has lapsed', async function (this: E2EWorld, name: string) {
  const user = await arrange(this, 'approved', name);
  await admin.from('members').update({ status: 'inactive' }).eq('user_id', user.id);
});

When('I approve the membership of {string}', async function (this: E2EWorld, name: string) {
  await openMemberManagement(this);
  await rowFor(this, name).getByRole('button', { name: 'Approve', exact: true }).click();
  await confirm(this, 'Approve Member');
});

When('I start approving the membership of {string} but cancel', async function (this: E2EWorld, name: string) {
  await openMemberManagement(this);
  await rowFor(this, name).getByRole('button', { name: 'Approve', exact: true }).click();
  await confirm(this, 'Cancel');
});

When('I reject the membership application of {string}', async function (this: E2EWorld, name: string) {
  await openMemberManagement(this);
  await rowFor(this, name).getByRole('button', { name: 'Reject', exact: true }).click();
  await confirm(this, 'Reject Application');
});

When('I deactivate the membership of {string}', async function (this: E2EWorld, name: string) {
  await openMemberManagement(this);
  await rowFor(this, name).getByRole('button', { name: 'Open menu' }).click();
  await this.page.getByRole('menuitem', { name: 'Deactivate Member' }).click();
  await confirm(this, 'Deactivate Member');
});

When('I reactivate the membership of {string}', async function (this: E2EWorld, name: string) {
  await openMemberManagement(this);
  await rowFor(this, name).getByRole('button', { name: 'Open menu' }).click();
  await this.page.getByRole('menuitem', { name: 'Reactivate Member' }).click();
  await confirm(this, 'Reactivate');
});

Then('{string} should be listed as {string}', async function (this: E2EWorld, name: string, badge: string) {
  await this.page.reload();
  await expect(rowFor(this, name)).toContainText(badge);
});

Then('{string} should not be listed as {string}', async function (this: E2EWorld, name: string, badge: string) {
  await this.page.reload();
  await expect(rowFor(this, name)).toBeVisible();
  await expect(rowFor(this, name)).not.toContainText(badge);
});

Then('{string} should be an approved member', async function (this: E2EWorld, name: string) {
  await expect.poll(async () => (await getMember(this.user(name).id))?.isApproved).toBe(true);
});

Then('the row for {string} should show their email address', async function (this: E2EWorld, name: string) {
  await expect(rowFor(this, name)).toContainText(this.user(name).email);
});

// ---------------------------------------------------------------- expenses

When(
  /^I add a (private )?\$([\d.]+) "([^"]+)" expense paid to "([^"]+)"$/,
  async function (this: E2EWorld, isPrivate: string | undefined, amount: string, category: string, payee: string) {
    // A unique description finds this scenario's row among parallel ones.
    const description = `E2E expense ${Math.random().toString(36).slice(2, 10)}`;
    this.data.expenseDescription = description;
    this.data.expenseAmount = amount;
    this.cleanup.push(async () => admin.from('expenses').delete().eq('description', description));

    await this.page.goto('/admin/expenses');
    await this.page.getByLabel('Amount (USD)').fill(amount);
    await this.page.getByLabel('Category').fill(category);
    await this.page.getByLabel('Payee').fill(payee);
    await this.page.getByLabel('Description').fill(description);
    if (isPrivate) await this.page.getByLabel(/^Private/).check();
    await this.page.getByRole('button', { name: 'Add Expense' }).click();
  }
);

When('I add an {string} expense broken down as:', async function (this: E2EWorld, category: string, table: DataTable) {
  const description = `E2E expense ${Math.random().toString(36).slice(2, 10)}`;
  const rows = table.raw();
  this.data.expenseDescription = description;
  // The amount is left blank: the breakdown's total becomes the expense's amount.
  this.data.expenseAmount = String(rows.reduce((sum, [, amount]) => sum + Number(amount.replace(/[$,]/g, '')), 0));
  this.cleanup.push(async () => admin.from('expenses').delete().eq('description', description));

  await this.page.goto('/admin/expenses');
  await this.page.getByLabel('Category').fill(category);
  await this.page.getByLabel('Description').fill(description);
  // Tab-separated, as two columns copied from a spreadsheet paste.
  await this.page.getByLabel(/^Cost breakdown/).fill(rows.map((r) => r.join('\t')).join('\n'));
  await this.page.getByRole('button', { name: 'Add Expense' }).click();
});

When(
  /^I edit the expense, changing the amount to \$([\d.]+) and adding income "([^"]+)"$/,
  async function (this: E2EWorld, amount: string, income: string) {
    this.data.expenseAmount = amount;
    await this.page.getByRole('row').filter({ hasText: this.data.expenseDescription }).getByRole('link', { name: /^Edit/ }).click();
    // The form is loaded with the expense: its description is how we know it's ready.
    await expect(this.page.getByLabel('Description')).toHaveValue(this.data.expenseDescription);
    await this.page.getByLabel('Amount (USD)').fill(amount);
    await this.page.getByLabel(/^Event income/).fill(income);
    await this.page.getByRole('button', { name: 'Save changes' }).click();
  }
);

Then('opening the expense should show {string} at {string}', async function (this: E2EWorld, item: string, amount: string) {
  await this.page.getByRole('row').filter({ hasText: this.data.expenseDescription }).click();
  await expect(this.page.locator('[data-breakdown] tr').filter({ hasText: item })).toContainText(amount);
});

Then('the expense should be listed on the expenses page', async function (this: E2EWorld) {
  await expect(this.page.getByRole('row').filter({ hasText: this.data.expenseDescription })).toContainText(
    `USD ${Number(this.data.expenseAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  );
});

Then(/^the expense should be recorded as (public|private)$/, async function (this: E2EWorld, visibility: string) {
  await expect
    .poll(async () => (await admin.from('expenses').select('amount, is_private').eq('description', this.data.expenseDescription).maybeSingle()).data)
    // Stored in cents, like the existing expense rows.
    .toEqual({ amount: Math.round(Number(this.data.expenseAmount) * 100), is_private: visibility === 'private' });
});

Then('I should be told that {string} has been approved', async function (this: E2EWorld, name: string) {
  // A sonner toast (BUG-022: the sonner toaster wasn't mounted, so this never showed).
  await expect(this.page.getByText(`${this.user(name).fullName} has been approved as a member`)).toBeVisible();
});
