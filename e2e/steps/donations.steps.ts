import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from '@playwright/test';
import { admin, createDonation, deleteUserByEmail, uniqueEmail } from '../support/db';
import { expect } from '../support/expect';
import { checkoutCompleted, postWebhook, sessionFromCheckoutUrl } from '../support/stripe';
import type { E2EWorld } from '../support/world';

type Frequency = 'once' | 'monthly' | 'yearly';
const FREQUENCY_BUTTON: Record<Frequency, string> = { once: 'One-Time', monthly: 'Monthly', yearly: 'Yearly' };

/** Step 1 of the /donate wizard. `amount` is a preset ("100") or a custom value ("19.99"). */
async function chooseDonation(page: Page, amountIn: string | number, frequency: Frequency) {
  const amount = String(amountIn); // cucumber turns integer-looking regex captures into numbers
  await page.goto('/donate');
  await page.getByRole('button', { name: FREQUENCY_BUTTON[frequency], exact: true }).click();
  if (['100', '200', '250', '500'].includes(amount)) {
    await page.getByRole('button', { name: `$${amount}`, exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Custom', exact: true }).click();
    await page.getByPlaceholder('$1,000').fill(amount);
  }
  await page.getByRole('button', { name: 'Continue to your information' }).click();
}

/** Step 2: donor details. */
async function enterDonor(world: E2EWorld, email: string, phone = '206-555-0100') {
  const page = world.page;
  // Signed-in donors get the form pre-filled from their donor record, if any.
  await page.getByLabel('Name of Donor').fill(world.me?.fullName ?? 'Farah Donor');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Phone').fill(phone);
  await page.getByLabel('Street Address').fill('2 Giving Way');
  await page.getByLabel('City').fill('Seattle');
  await page.getByLabel('Zip').fill('98101');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
}

/** The donor's email: a signed-in persona's own, or a fresh one for a guest (cleaned up after). */
function donorEmail(world: E2EWorld) {
  if (world.me) return world.me.email;
  const email = uniqueEmail('guest-donor');
  // The app creates an auth user, a Stripe customer and donor rows for a guest donor.
  world.cleanup.push(() => deleteUserByEmail(email));
  return email;
}

async function donateByCard(world: E2EWorld, amount: string, frequency: Frequency) {
  const email = donorEmail(world);
  world.donation = { id: '', donor_email: email };
  await chooseDonation(world.page, amount, frequency);
  await enterDonor(world, email);
  await world.page.getByRole('button', { name: /^Donate .* Now$/ }).click();
  await world.page.waitForURL(/checkout\.stripe\.com/, { waitUntil: 'commit', timeout: 30_000 });
  world.checkoutSessionId = (await sessionFromCheckoutUrl(world.page.url())).id;
  const { data } = await admin
    .from('donations')
    .select('id, donors!inner(email)')
    .eq('donors.email', email)
    .order('donation_date', { ascending: false })
    .limit(1)
    .single();
  world.donation.id = data!.id;
}

When(/^I donate \$(\d+) (once|monthly|yearly) by card$/, async function (this: E2EWorld, amount: string, freq: Frequency) {
  await donateByCard(this, amount, freq);
});

When(/^I donate a custom amount of \$([\d.]+) once by card$/, async function (this: E2EWorld, amount: string) {
  await donateByCard(this, amount, 'once');
});

Given('I have started a one-time $100 card donation', async function (this: E2EWorld) {
  await donateByCard(this, '100', 'once');
  await this.page.goto('/'); // leave Stripe's page; the browser stays on our site
});

When('I enter my donor details with email {string} and phone {string}', async function (this: E2EWorld, email: string, phone: string) {
  await chooseDonation(this.page, '100', 'once');
  await enterDonor(this, email, phone);
});

When('I choose to donate $100 by Zelle and finish', async function (this: E2EWorld) {
  const email = donorEmail(this);
  await chooseDonation(this.page, '100', 'once');
  await enterDonor(this, email);
  await this.page.getByRole('combobox').filter({ hasText: /Credit Card|Card/ }).click();
  await this.page.getByRole('option', { name: 'Zelle' }).click();
  await expect(this.page.getByText('Donate via Zelle')).toBeVisible();
  await this.page.getByRole('button', { name: 'Done', exact: true }).click();
  // The app either redirects (Stripe or ?error=) or settles on the page: give it the chance.
  await this.page.waitForURL(/checkout\.stripe\.com|[?&]error=|confirmation/, { waitUntil: 'commit', timeout: 15_000 }).catch(() => {});
});

Then(
  /^I should be taken to Stripe Checkout for \$([\d.]+) as (a one-time payment|a subscription)$/,
  async function (this: E2EWorld, dollars: string, kind: string) {
    expect(this.page.url()).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    const session = await sessionFromCheckoutUrl(this.page.url());
    expect(session.livemode).toBe(false);
    expect(session.amount_total).toBe(Math.round(Number(dollars) * 100));
    expect(session.mode).toBe(kind === 'a subscription' ? 'subscription' : 'payment');
    expect(session.metadata).toMatchObject({ type: 'donation', donation_id: this.donation!.id });
  }
);

Then(/^a pending \$([\d.]+) donation should be recorded for my email$/, async function (this: E2EWorld, dollars: string) {
  const { data } = await admin.from('donations').select('donation_amount, donation_status').eq('id', this.donation!.id).single();
  expect(data).toEqual({ donation_amount: Number(dollars) * 100, donation_status: 'pending' });
});

When('Stripe confirms the payment for my donation', async function (this: E2EWorld) {
  const res = await postWebhook(checkoutCompleted({ type: 'donation', donation_id: this.donation!.id }, 10_000));
  expect(res.status, res.body).toBe(200);
});

Then('my donation should be marked as completed', async function (this: E2EWorld) {
  const { data } = await admin.from('donations').select('donation_status, stripe_payment_id').eq('id', this.donation!.id).single();
  expect(data?.donation_status).toBe('completed');
  expect(data?.stripe_payment_id).toMatch(/^pi_/);
});

Given(/^a (completed|pending) \$(\d+) donation by a guest donor$/, async function (this: E2EWorld, status: 'completed' | 'pending', dollars: string) {
  this.donation = await createDonation(this.cleanup, { amountCents: Number(dollars) * 100, status });
});

When(/^I open the receipt for (?:my|that) donation$/, async function (this: E2EWorld) {
  await this.page.goto(`/donate/confirmation/${this.donation!.id}`);
});

Then('the receipt PDF should download', async function (this: E2EWorld) {
  const res = await this.page.request.get(`/donate/confirmation/${this.donation!.id}/pdf`, { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');
});

Then('the donation form should be finished', async function (this: E2EWorld) {
  await expect(this.page.getByRole('button', { name: 'Done', exact: true })).toBeHidden();
});
