import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from '@playwright/test';
import { admin, findAuthUserId, getMember } from '../support/db';
import { expect } from '../support/expect';
import { giveSubscription, postWebhook, stripe } from '../support/stripe';
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
  // Registration is done once the server sends the member on to the fee page.
  await expect(this.page).toHaveURL(/\/membership-fee/, { timeout: 20_000 });
});

When('I submit the registration form without a {string}', async function (this: E2EWorld, field: string) {
  await fillRegistration(this.page, field);
});

When('I submit my registration form again', async function (this: E2EWorld) {
  await this.page.goto('/register');
  // Since W25 an approved member is sent to their account instead of the form;
  // only if the form is shown is there anything to resubmit.
  // (The redirect lands a moment after the page starts streaming.)
  const left = await this.page.waitForURL((u) => !u.pathname.startsWith('/register'), { timeout: 5_000 }).then(
    () => true,
    () => false
  );
  if (left) return;
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

// ---------------------------------------------------------------- subscriptions (BUG-023, BUG-024)

Given(/^I have an active (contribution plan|recurring donation)$/, async function (this: E2EWorld, plan: string) {
  const kind = plan === 'contribution plan' ? 'contribution' : 'donation';
  const sub = await giveSubscription(this.cleanup, this.me!, kind);
  this.data[`${kind}Subscription`] = sub.subscriptionId;
  this.data.stripeCustomer = sub.customerId;
});

When(/^Stripe reports my (contribution plan|recurring donation) as (cancelled|active)$/, async function (this: E2EWorld, plan: string, state: string) {
  const id = this.data[`${plan === 'contribution plan' ? 'contribution' : 'donation'}Subscription`];
  if (state === 'cancelled') await stripe.subscriptions.cancel(id);
  const res = await postWebhook({
    type: state === 'cancelled' ? 'customer.subscription.deleted' : 'customer.subscription.updated',
    data: { object: { id, object: 'subscription', customer: this.data.stripeCustomer } },
  });
  expect(res.status, res.body).toBe(200);
});

// BUG-082: members activated by hand, or before the webhook kept members.subscription_id, have no plan link.
Given("my member row doesn't point at my plan", async function (this: E2EWorld) {
  await expect.poll(async () => (await getMember(this.me!.id))?.subscription_id, { message: 'webhook linked the plan' }).toBeTruthy();
  const { error } = await admin.from('members').update({ subscription_id: null }).eq('user_id', this.me!.id);
  expect(error).toBeNull();
});

Then('the member directory should show my contribution plan as {string}', async function (this: E2EWorld, plan: string) {
  const member = await getMember(this.me!.id);
  const row = this.page.getByRole('row').filter({ has: this.page.getByRole('link', { name: member!.fullName!, exact: true }) });
  await expect(row).toContainText(plan.replace('USD ', 'USD\u00a0'));
  await expect(row).not.toContainText('No contribution plan yet');
});

Then(/^my membership should be (active|inactive)$/, async function (this: E2EWorld, status: string) {
  await expect.poll(async () => (await getMember(this.me!.id))?.status).toBe(status);
});

When('I register but my browser sends the form without a name', async function (this: E2EWorld) {
  await this.page.route('**/*', async (route) => {
    const body = route.request().postData();
    if (route.request().headers()['next-action'] && body?.includes(`"fullName":"${VALID.Name}"`)) {
      this.data.rewrote = 'yes';
      return route.continue({ postData: body.replace(`"fullName":"${VALID.Name}"`, '"fullName":""') });
    }
    return route.continue();
  });
  await fillRegistration(this.page);
  await expect.poll(() => this.data.rewrote, { message: 'the registerMember request was not rewritten' }).toBe('yes');
});

Then('no membership should have been created for me', async function (this: E2EWorld) {
  expect(await getMember(await currentUserId(this))).toBeNull();
});
