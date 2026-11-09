import { Then, When } from '@cucumber/cucumber';
import type { Page } from '@playwright/test';
import { findAuthUserId, getMember } from '../support/db';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

const VALID = { Name: 'Hani Baloch', Phone: '206-555-0142', Address: '100 Pine St', City: 'Seattle', Zip: '98101' };

async function fillRegistration(page: Page, skip?: string) {
  await page.goto('/register');
  for (const [label, value] of Object.entries(VALID)) {
    const field = page.getByLabel(label, { exact: true });
    await field.fill(label === skip ? '' : value);
  }
  await acceptTerms(page);
  await page.getByRole('button', { name: 'Register as member' }).click();
}

async function acceptTerms(page: Page) {
  const terms = page.getByRole('checkbox');
  // Under load a click can land before React hydrates the checkbox and be lost;
  // retry until the checkbox really reports checked.
  await expect(async () => {
    if ((await terms.getAttribute('data-state')) !== 'checked') await terms.click();
    await expect(terms).toHaveAttribute('data-state', 'checked', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/** The current user's id: personas have one; people who signed up in the UI are looked up. */
async function currentUserId(world: E2EWorld) {
  if (world.me?.id) return world.me.id;
  const id = await findAuthUserId(world.users.newcomer.email);
  if (!id) throw new Error('no current user');
  return id;
}

When('I register as an individual member living in Seattle, WA', async function (this: E2EWorld) {
  await fillRegistration(this.page);
});

When('I submit the registration form without a {string}', async function (this: E2EWorld, field: string) {
  await fillRegistration(this.page, field);
});

When('I submit my registration form again', async function (this: E2EWorld) {
  await this.page.goto('/register');
  await acceptTerms(this.page);
  await this.page.getByRole('button', { name: 'Register as member' }).click();
  await expect(this.page).not.toHaveURL(/\/register/);
});

When('I accept the terms and conditions', async function (this: E2EWorld) {
  await acceptTerms(this.page);
});

When('I choose the {string} membership type', async function (this: E2EWorld, type: string) {
  await this.page.getByRole('combobox').first().click();
  await this.page.getByRole('option', { name: type, exact: true }).click();
});

Then('the {string} button should be disabled', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('button', { name, exact: true })).toBeDisabled();
});

Then('the {string} button should be enabled', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('button', { name, exact: true })).toBeEnabled();
});

Then('my membership application should be awaiting admin approval', async function (this: E2EWorld) {
  const userId = await currentUserId(this);
  await expect.poll(async () => (await getMember(userId))?.isApproved, { message: 'member row exists, not approved' }).toBe(false);
  const member = await getMember(userId);
  expect(member).toMatchObject({ fullName: VALID.Name, city: 'Seattle', state: 'WA', membershipType: 'Individual' });
});

Then('I should still be an approved member', async function (this: E2EWorld) {
  const member = await getMember(this.me!.id);
  expect(member, 'member row').toMatchObject({ isApproved: true, status: 'active' });
});

Then('I should not be on a page for an undefined member', async function (this: E2EWorld) {
  await this.page.waitForLoadState();
  expect(this.page.url()).not.toContain('/members/undefined');
});
