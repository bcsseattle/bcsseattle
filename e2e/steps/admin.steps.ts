import { Given, Then, When } from '@cucumber/cucumber';
import { admin, getMember } from '../support/db';
import { expect } from '../support/expect';
import { arrange } from './common.steps';
import type { E2EWorld } from '../support/world';

function rowFor(world: E2EWorld, name: string) {
  return world.page.getByRole('row').filter({ hasText: world.user(name).fullName });
}

async function openMemberManagement(world: E2EWorld) {
  if (!world.page.url().endsWith('/admin/members')) await world.page.goto('/admin/members');
  await expect(world.page.getByRole('heading', { name: 'Member Management' })).toBeVisible();
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
