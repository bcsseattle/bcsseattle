import { Given, Then, When } from '@cucumber/cucumber';
import { admin, anonClient, createFundraiser, createUser, uniqueEmail } from '../support/db';
import { expect } from '../support/expect';
import { checkoutCompleted, postWebhook, sessionFromCheckoutUrl } from '../support/stripe';
import type { E2EWorld } from '../support/world';
import { tamperWithCheckoutAmount } from './donations.steps';

/** Fundraisers need a creator; scenarios don't care who, so one is made behind the scenes. */
async function organiser(world: E2EWorld) {
  world.users.organiser ??= await createUser(world.cleanup, { fullName: 'Fundraiser Organiser', isAdmin: true });
  return world.users.organiser;
}

Given(/^there is an active fundraiser "([^"]+)" with a goal of \$([\d,]+)$/, async function (this: E2EWorld, title: string, goal: string) {
  // Titles are shown on a shared list page: suffix them so parallel scenarios never collide.
  this.fundraiser = await createFundraiser(this.cleanup, await organiser(this), {
    title: `${title} ${Math.random().toString(36).slice(2, 6)}`,
    goal_amount: Number(goal.replace(/,/g, '')),
  });
  this.data[title] = this.fundraiser.id;
});

Given('there is an active fundraiser {string} with no end date', async function (this: E2EWorld, title: string) {
  this.fundraiser = await createFundraiser(this.cleanup, await organiser(this), { title, ends_at: null });
  this.data[title] = this.fundraiser.id;
});

Then(
  /^I should see the fundraiser "([^"]+)" with "([^"]+)" towards a "([^"]+)"$/,
  async function (this: E2EWorld, _title: string, raised: string, goal: string) {
    const card = this.page.getByRole('link').filter({ hasText: this.fundraiser!.title });
    await expect(card).toBeVisible();
    await expect(card).toContainText(raised);
    await expect(card).toContainText(goal.replace(/ goal$/, ''));
  }
);

async function fillDonation(world: E2EWorld, amount: string) {
  await world.page.goto(`/fundraisers/${world.fundraiser!.id}/donate`);
  await world.page.getByLabel('Donation Amount ($)').fill(amount);
  await world.page.getByLabel('Email').fill(world.me!.email);
  await world.page.getByLabel('Full Name').fill(world.me!.fullName);
  await world.page.getByRole('button', { name: 'Continue to Payment' }).click();
}

async function donate(world: E2EWorld, amount: string) {
  await fillDonation(world, amount);
  await world.page.waitForURL(/checkout\.stripe\.com/, { waitUntil: 'commit', timeout: 30_000 });
  const session = await sessionFromCheckoutUrl(world.page.url());
  world.checkoutSessionId = session.id;
  world.data.fundraiserDonationId = session.metadata!.donation_id;
}

When(/^I donate \$([\d.]+) to the fundraiser$/, async function (this: E2EWorld, amount: string) {
  await donate(this, String(amount));
});

Given(/^I have started a \$(\d+) donation to the fundraiser$/, async function (this: E2EWorld, amount: string) {
  await donate(this, String(amount));
  await this.page.goto('/');
});

When(/^I try to donate \$([\d.]+) to the fundraiser$/, async function (this: E2EWorld, amount: string) {
  await fillDonation(this, String(amount));
});

When(/^I try to donate \$(\d+) to the fundraiser but my browser sends \$([\d.]+)$/, async function (this: E2EWorld, amount: string, sent: string) {
  // Rewrites the amount argument of the submitDonation server action (BUG-043).
  const id = this.fundraiser!.id;
  await this.page.route('**/*', async (route) => {
    const body = route.request().postData();
    const from = `"${id}",${amount},`;
    if (route.request().headers()['next-action'] && body?.includes(from)) {
      this.data.rewrote = 'yes';
      return route.continue({ postData: body.replace(from, `"${id}",${sent},`) });
    }
    return route.continue();
  });
  const answered = this.page.waitForResponse((r) => !!r.request().headers()['next-action'] && (r.request().postData() ?? '').includes(id));
  await fillDonation(this, String(amount));
  await answered;
  expect(this.data.rewrote, 'the submitDonation request was not rewritten').toBe('yes');
  this.cleanup.push(async () => admin.from('fundraiser_donations').delete().eq('fundraiser_id', id));
});

Given(/^the fundraiser's minimum donation is \$(\d+)$/, async function (this: E2EWorld, dollars: string) {
  const { error } = await admin.from('fundraisers').update({ minimum_donation: Number(dollars) }).eq('id', this.fundraiser!.id);
  expect(error).toBeNull();
});

Then('no donation should be recorded for the fundraiser', async function (this: E2EWorld) {
  const { count } = await admin.from('fundraiser_donations').select('id', { count: 'exact', head: true }).eq('fundraiser_id', this.fundraiser!.id);
  expect(count).toBe(0);
});

Then('I should not be taken to Stripe Checkout', async function (this: E2EWorld) {
  await this.page.waitForLoadState('networkidle');
  expect(this.page.url()).not.toContain('checkout.stripe.com');
});

Then(/^I should be taken to Stripe Checkout for \$([\d.]+) for the fundraiser$/, async function (this: E2EWorld, dollars: string) {
  const session = await sessionFromCheckoutUrl(this.page.url());
  expect(session.livemode).toBe(false);
  expect(session.amount_total).toBe(Math.round(Number(dollars) * 100));
  expect(session.metadata).toMatchObject({ type: 'fundraiser_donation', fundraiser_id: this.fundraiser!.id });
});

Then(/^a pending \$([\d.]+) fundraiser donation should be recorded$/, async function (this: E2EWorld, amount: string) {
  const { data } = await admin
    .from('fundraiser_donations')
    .select('amount, payment_status, fundraiser_id')
    .eq('id', this.data.fundraiserDonationId)
    .single();
  expect(data).toEqual({ amount: Number(amount), payment_status: 'pending', fundraiser_id: this.fundraiser!.id });
});

function confirmationEvent(world: E2EWorld) {
  // Built once per scenario so "the same confirmation again" really is identical.
  world.data.event ??= JSON.stringify(
    checkoutCompleted({ type: 'fundraiser_donation', fundraiser_id: world.fundraiser!.id, donation_id: world.data.fundraiserDonationId }, 2500)
  );
  return JSON.parse(world.data.event);
}

When('Stripe confirms the payment for my fundraiser donation', async function (this: E2EWorld) {
  const res = await postWebhook(confirmationEvent(this));
  expect(res.status, res.body).toBe(200);
});

When('Stripe sends the same confirmation again', async function (this: E2EWorld) {
  await postWebhook(confirmationEvent(this));
});

When('I open the fundraiser', async function (this: E2EWorld) {
  await this.page.goto(`/fundraisers/${this.fundraiser!.id}`);
});

When('I open the donation page of {string}', async function (this: E2EWorld, title: string) {
  await this.page.goto(`/fundraisers/${this.data[title]}/donate`);
});

Then('the fundraiser should show {string} raised', async function (this: E2EWorld, amount: string) {
  await expect(this.page.getByText(amount, { exact: true }).first()).toBeVisible();
  await expect(this.page.getByText(/raised of/)).toBeVisible();
});

Then(/^the fundraiser's total should be \$([\d.]+)$/, async function (this: E2EWorld, amount: string) {
  const { data } = await admin.from('fundraisers').select('current_amount').eq('id', this.fundraiser!.id).single();
  expect(data?.current_amount).toBe(Number(amount));
});

Then('the donor wall should list my donation', async function (this: E2EWorld) {
  // The member's name appears on this page only on the donor wall.
  await expect(this.page.getByText('People who have supported this fundraiser')).toBeVisible();
  await expect(this.page.getByText(this.me!.fullName).first()).toBeVisible();
});

// ---------------------------------------------------------------- admin

async function fillFundraiserForm(world: E2EWorld, fields: { title?: string; description?: string; goal?: string }) {
  await world.page.goto('/fundraisers/admin/new');
  await world.page.getByLabel('Title').fill(fields.title ?? `E2E Fundraiser ${Date.now()}`);
  await world.page.getByLabel('Description').fill(fields.description ?? 'Raising money to cover costs for a family in need.');
  await world.page.getByLabel('Goal Amount ($)').fill(fields.goal ?? '1000');
  const inAMonth = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await world.page.getByLabel('End Date').fill(inAMonth);
  await world.page.getByRole('combobox').click();
  await world.page.getByRole('option', { name: 'Community' }).click();
  await world.page.getByRole('button', { name: 'Create Fundraiser' }).click();
}

When(/^I create a fundraiser titled "([^"]+)" with a goal of \$([\d,]+)$/, async function (this: E2EWorld, title: string, goal: string) {
  await fillFundraiserForm(this, { title, goal: goal.replace(/,/g, '') });
  await expect(this.page).toHaveURL(/\/fundraisers\/[0-9a-f-]{36}$/);
  const id = this.page.url().split('/').pop()!;
  this.cleanup.push(async () => admin.from('fundraisers').delete().eq('id', id));
  this.data.createdFundraiserId = id;
});

Then(/^the fundraiser "([^"]+)" should be active with a goal of \$([\d,]+)$/, async function (this: E2EWorld, title: string, goal: string) {
  const { data } = await admin.from('fundraisers').select('title, status, goal_amount, created_by').eq('id', this.data.createdFundraiserId).single();
  expect(data).toEqual({ title, status: 'active', goal_amount: Number(goal.replace(/,/g, '')), created_by: this.me!.id });
});

When(/^I submit a new fundraiser with (title|description|goal) "([^"]*)"$/, async function (this: E2EWorld, field: string, value: string) {
  await fillFundraiserForm(this, { [field]: value });
});

When('I rename the fundraiser to {string}', async function (this: E2EWorld, title: string) {
  await this.page.goto(`/fundraisers/admin/${this.fundraiser!.id}/edit`);
  await this.page.getByLabel('Title').fill(title);
  await this.page.getByRole('button', { name: 'Update Fundraiser' }).click();
  await this.page.waitForLoadState('networkidle');
});

Then('the fundraiser should be saved as {string}', async function (this: E2EWorld, title: string) {
  await expect
    .poll(async () => (await admin.from('fundraisers').select('title').eq('id', this.fundraiser!.id).single()).data?.title)
    .toBe(title);
});

When('I open the fundraiser from the list', async function (this: E2EWorld) {
  await this.page.getByRole('link').filter({ hasText: this.fundraiser!.title }).click();
  await expect(this.page).toHaveURL(new RegExp(`/fundraisers/${this.fundraiser!.id}$`));
});

Then("I should see the fundraiser's title as the page heading", async function (this: E2EWorld) {
  await expect(this.page.getByRole('heading', { name: this.fundraiser!.title, level: 1 })).toBeVisible();
});

Then('the donation amount should be refused', async function (this: E2EWorld) {
  // Refused either by the browser's own range check (the input has min/max) or by
  // the form's validation message: both stop the donor before payment.
  const field = this.page.getByLabel('Donation Amount ($)');
  const nativelyInvalid = await field.evaluate((el) => !(el as HTMLInputElement).checkValidity());
  if (!nativelyInvalid) {
    await expect(this.page.getByText(/Amount must be greater than 0|Maximum amount is|Minimum donation amount/)).toBeVisible();
  }
});

// ---------------------------------------------------------------- public API (BUG-079, BUG-080)

When('an anonymous visitor records a paid ${int} donation to the fundraiser through the public API', async function (this: E2EWorld, dollars: number) {
  const { error } = await anonClient()
    .from('fundraiser_donations')
    .insert({ fundraiser_id: this.fundraiser!.id, amount: dollars, donor_name: 'Mallory', payment_status: 'completed' });
  this.apiError = error?.message ?? '';
  this.cleanup.push(async () => {
    await admin.from('fundraiser_donations').delete().eq('fundraiser_id', this.fundraiser!.id).eq('donor_name', 'Mallory');
  });
});

Given('a guest has left their contact details with a fundraiser donation', async function (this: E2EWorld) {
  const { data } = await admin
    .from('fundraiser_donors')
    .insert({ email: uniqueEmail('fdonor'), full_name: 'Guest Donor', phone: '206-555-0177' })
    .select('id, email')
    .single();
  this.data.guestDonorId = data!.id;
  this.data.guestDonorEmail = data!.email;
  this.cleanup.push(async () => {
    await admin.from('fundraiser_donors').delete().eq('id', data!.id);
  });
});

When('I post the update {string}', async function (this: E2EWorld, text: string) {
  await this.page.getByLabel('New update').fill(text);
  await this.page.getByRole('button', { name: 'Add Update' }).click();
});

Then('the fundraiser should have the update {string}', async function (this: E2EWorld, text: string) {
  await expect
    .poll(async () => (await admin.from('fundraiser_updates').select('content').eq('fundraiser_id', this.fundraiser!.id)).data)
    .toEqual([{ content: text }]);
});

When(/^I donate \$(\d+) to the fundraiser but my browser asks checkout to charge \$(\d+)$/, async function (this: E2EWorld, amount: string, charged: string) {
  await tamperWithCheckoutAmount(this, Number(amount) * 100, Number(charged) * 100);
  await donate(this, String(amount));
});

When('someone donates to the fundraiser with that guest\'s email as {string} with phone {string}', async function (this: E2EWorld, name: string, phone: string) {
  await this.page.goto(`/fundraisers/${this.fundraiser!.id}/donate`);
  await this.page.getByLabel('Donation Amount ($)').fill('25');
  await this.page.getByLabel('Email').fill(this.data.guestDonorEmail);
  await this.page.getByLabel('Full Name').fill(name);
  const phoneField = this.page.getByLabel('Phone');
  if (await phoneField.count()) await phoneField.fill(phone);
  await this.page.getByRole('button', { name: 'Continue to Payment' }).click();
  await this.page.waitForURL(/checkout\.stripe\.com/, { waitUntil: 'commit', timeout: 30_000 });
  this.cleanup.push(async () => admin.from('fundraiser_donations').delete().eq('fundraiser_id', this.fundraiser!.id));
});

Then('the guest\'s saved name and phone should be unchanged', async function (this: E2EWorld) {
  const { data } = await admin.from('fundraiser_donors').select('full_name, phone').eq('id', this.data.guestDonorId).single();
  expect(data).toEqual({ full_name: 'Guest Donor', phone: '206-555-0177' });
});

// ---------------------------------------------------------------- delete (BUG-062)

When('I delete the fundraiser through the API', async function (this: E2EWorld) {
  const res = await this.page.request.delete(`/api/fundraisers/${this.fundraiser!.id}`);
  this.response = { status: res.status(), body: await res.text() };
});

Given('the fundraiser has a donation', async function (this: E2EWorld) {
  const { error } = await admin.from('fundraiser_donations').insert({ fundraiser_id: this.fundraiser!.id, amount: 25, donor_name: 'E2E', payment_status: 'completed' });
  expect(error).toBeNull();
});

Then(/^the fundraiser should (still exist|be gone)$/, async function (this: E2EWorld, state: string) {
  const { count } = await admin.from('fundraisers').select('id', { count: 'exact', head: true }).eq('id', this.fundraiser!.id);
  expect(count, this.response?.body).toBe(state === 'be gone' ? 0 : 1);
});

Then('the delete should be refused with {int}', async function (this: E2EWorld, status: number) {
  expect(this.response!.status, this.response!.body).toBe(status);
});
