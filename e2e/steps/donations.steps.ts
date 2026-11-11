import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from '@playwright/test';
import { admin, createDonation, deleteUserByEmail, findAuthUserId, uniqueEmail } from '../support/db';
import { expect } from '../support/expect';
import { env } from '../support/env';
import { checkoutCompleted, postWebhook, sessionFromCheckoutUrl } from '../support/stripe';
import type { E2EWorld } from '../support/world';

type Frequency = 'once' | 'monthly' | 'yearly';
const FREQUENCY_BUTTON: Record<Frequency, string> = { once: 'One-time', monthly: 'Monthly', yearly: 'Yearly' };

/** Step 1 of the /donate wizard. `amount` is a preset ("100") or a custom value ("19.99"). */
async function chooseDonation(page: Page, amountIn: string | number, frequency: Frequency) {
  const amount = String(amountIn); // cucumber turns integer-looking regex captures into numbers
  await page.goto('/donate');
  // Frequency is a segmented control and the amounts are option cards: radios.
  await page.getByRole('radio', { name: FREQUENCY_BUTTON[frequency], exact: true }).click();
  if (['100', '200', '250', '500'].includes(amount)) {
    await page.getByRole('radio', { name: new RegExp(`^USD\\s${amount}$`) }).click();
  } else {
    await page.getByRole('radio', { name: 'Other amount', exact: true }).click();
    await page.getByLabel('Other amount (USD)').fill(amount);
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
  if (world.data.returningDonorEmail) return world.data.returningDonorEmail;
  const email = uniqueEmail('guest-donor');
  // The app creates an auth user, a Stripe customer and donor rows for a guest donor.
  world.cleanup.push(() => deleteUserByEmail(email));
  return email;
}

async function donateByCard(world: E2EWorld, amount: string, frequency: Frequency, phone?: string) {
  const email = donorEmail(world);
  world.donation = { id: '', donor_email: email };
  await chooseDonation(world.page, amount, frequency);
  await enterDonor(world, email, phone);
  await world.page.getByRole('button', { name: /^Donate USD/ }).click();
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
  await this.page.getByRole('radio', { name: /^Zelle/ }).click();
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

Given(/^a (completed|pending|refunded) \$(\d+) donation by a guest donor$/, async function (this: E2EWorld, status: 'completed' | 'pending' | 'refunded', dollars: string) {
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

/** Plays an attacker: rewrites the amount the browser sends to the checkout server action (BUG-013). */
export async function tamperWithCheckoutAmount(world: E2EWorld, fromCents: number, toCents: number) {
  await world.page.route('**/*', async (route) => {
    const req = route.request();
    const body = req.postData();
    if (req.method() === 'POST' && req.headers()['next-action'] && body?.includes(`"unit_amount":${fromCents}`)) {
      return route.continue({ postData: body.replaceAll(`"unit_amount":${fromCents}`, `"unit_amount":${toCents}`) });
    }
    return route.continue();
  });
}

When(/^I donate \$(\d+) once by card but my browser asks checkout to charge \$(\d+)$/, async function (this: E2EWorld, amount: string, charged: string) {
  await tamperWithCheckoutAmount(this, Number(amount) * 100, Number(charged) * 100);
  await donateByCard(this, amount, 'once');
});

// A bank (ACH) payment: Checkout completes unpaid, then Stripe reports it settled or failed (BUG-041).
const bankEvents = {
  started: { type: 'checkout.session.completed', payment_status: 'unpaid' },
  settled: { type: 'checkout.session.async_payment_succeeded', payment_status: 'paid' },
  failed: { type: 'checkout.session.async_payment_failed', payment_status: 'unpaid' },
} as const;

When(/^Stripe reports the bank payment for the donation as (started|settled|failed)$/, async function (this: E2EWorld, stage: keyof typeof bankEvents) {
  const event = checkoutCompleted({ type: 'donation', donation_id: this.donation!.id }, 5_000);
  event.type = bankEvents[stage].type;
  (event.data.object as Record<string, unknown>).payment_status = bankEvents[stage].payment_status;
  const res = await postWebhook(event);
  expect(res.status, res.body).toBe(200);
});

Then(/^the donation should be (pending|completed|failed)$/, async function (this: E2EWorld, status: string) {
  const { data } = await admin.from('donations').select('donation_status').eq('id', this.donation!.id).single();
  expect(data?.donation_status).toBe(status);
});

When('I download the receipt PDF for that donation', async function (this: E2EWorld) {
  const res = await this.page.request.get(`/donate/confirmation/${this.donation!.id}/pdf`);
  this.response = { status: res.status(), body: res.headers()['content-type'] ?? '' };
});

Then('no PDF should be returned', async function (this: E2EWorld) {
  expect(this.response!.body).not.toContain('application/pdf');
});

Then('the donation should not be marked as receipted', async function (this: E2EWorld) {
  const { data } = await admin.from('donations').select('tax_receipt_generated').eq('id', this.donation!.id).single();
  expect(data?.tax_receipt_generated).toBe(false);
});

// ---------------------------------------------------------------- donor accounts (BUG-053)

Given(/^a returning guest donor whose account is followed by (\d+) newer accounts$/, async function (this: E2EWorld, n: string) {
  // Users are listed newest first, so the donor ends up past the first page of 50.
  const email = uniqueEmail('returning-donor');
  const { data, error } = await admin.auth.admin.createUser({ email });
  expect(error).toBeNull();
  this.data.returningDonorEmail = email;
  this.data.returningDonorId = data.user!.id;
  this.cleanup.push(() => deleteUserByEmail(email));
  const fillers = Array.from({ length: Number(n) }, () => uniqueEmail('filler'));
  for (const f of fillers) {
    await admin.auth.admin.createUser({ email: f });
    this.cleanup.push(() => deleteUserByEmail(f));
  }
});

Then("the donation should be linked to the returning donor's account", async function (this: E2EWorld) {
  // Checkout links the donor's existing account to a Stripe customer, not a new one.
  const { data } = await admin.from('customers').select('stripe_customer_id').eq('id', this.data.returningDonorId).maybeSingle();
  expect(data?.stripe_customer_id).toMatch(/^cus_/);
});

Then("nobody should be able to sign in to the donor's account with a shared password", async function (this: E2EWorld) {
  // As if the donor later confirmed their email: only then does a password matter.
  const id = await findAuthUserId(this.donation!.donor_email);
  expect(id, 'checkout created no account for the donor').toBeTruthy();
  await admin.auth.admin.updateUserById(id!, { email_confirm: true });
  const { error } = await anonSignIn(this.donation!.donor_email, process.env.SUPABASE_DEFAULT_PASSWORD || 'e2e-default-password');
  expect(error, 'signed in with the shared default password').not.toBeNull();
});

async function anonSignIn(email: string, password: string) {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(env.supabaseUrl, env.anonKey, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password });
}

// ---------------------------------------------------------------- donor details step (BUG-077)

When('I donate $100 once by card without giving a phone number', async function (this: E2EWorld) {
  await donateByCard(this, '100', 'once', '');
});

When('I continue past my donor details without a name', async function (this: E2EWorld) {
  await chooseDonation(this.page, '100', 'once');
  await this.page.getByLabel('Name of Donor').fill('');
  await this.page.getByLabel('Email').fill(donorEmail(this));
  await this.page.getByLabel('Phone').fill('206-555-0100'); // with a valid phone the old form skipped the name
  await this.page.getByRole('button', { name: 'Continue to payment' }).click();
});

Then('I should still be on the donor details step', async function (this: E2EWorld) {
  await expect(this.page.getByRole('button', { name: 'Continue to payment' })).toBeVisible();
});

// W12: a signed-in giver's gift is filed under their own donor record.
Given('another donor has given before', async function (this: E2EWorld) {
  const email = uniqueEmail('other-donor');
  const { data, error } = await admin.from('donors').insert({ email, full_name: 'Other Donor', donor_type: 'individual' }).select('id').single();
  if (error) throw new Error(error.message);
  this.data.otherDonorId = data.id;
  this.data.otherDonorEmail = email;
  this.cleanup.push(async () => {
    await admin.from('donations').delete().eq('donor_id', data.id);
    await admin.from('donors').delete().eq('id', data.id);
  });
});

When("I donate $100 once by card giving that donor's email", async function (this: E2EWorld) {
  await chooseDonation(this.page, '100', 'once');
  await enterDonor(this, this.data.otherDonorEmail as string);
  await this.page.getByRole('button', { name: /^Donate USD/ }).click();
  await this.page.waitForURL(/checkout\.stripe\.com/, { waitUntil: 'commit', timeout: 30_000 });
});

Then('my donation should be filed under my own donor record', async function (this: E2EWorld) {
  const { data: mine } = await admin.from('donors').select('id').eq('user_id', this.me!.id);
  expect(mine ?? [], 'a donor record linked to my account').toHaveLength(1);
  const { count: theirs } = await admin
    .from('donations')
    .select('id', { count: 'exact', head: true })
    .eq('donor_id', this.data.otherDonorId as string);
  expect(theirs).toBe(0);
  const { count: ours } = await admin.from('donations').select('id', { count: 'exact', head: true }).eq('donor_id', mine![0].id);
  expect(ours).toBe(1);
});

When('Stripe reports that checkout for the donation expired', async function (this: E2EWorld) {
  const event = checkoutCompleted({ type: 'donation', donation_id: this.donation!.id }, 10_000);
  event.type = 'checkout.session.expired';
  (event.data.object as Record<string, unknown>).payment_status = 'unpaid';
  const res = await postWebhook(event);
  expect(res.status, res.body).toBe(200);
});
