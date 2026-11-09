import AxeBuilder from '@axe-core/playwright';
import { Given, Then, When } from '@cucumber/cucumber';
import { admin, uniqueEmail } from '../support/db';
import { env } from '../support/env';
import { expect } from '../support/expect';
import { postWebhook, checkoutCompleted } from '../support/stripe';
import type { E2EWorld } from '../support/world';

// ---------------------------------------------------------------- contact & funeral fund

When('I send the contact form as {string} from {string} saying {string}', async function (this: E2EWorld, name: string, email: string, message: string) {
  this.data.sentAfter = new Date(Date.now() - 1000).toISOString();
  await this.page.goto('/contact-us');
  await this.page.getByLabel('Name').fill(name);
  await this.page.getByLabel('Email').fill(email);
  await this.page.getByLabel('Message').fill(message);
  await this.page.getByRole('button', { name: 'Send' }).click();
});

When('I sign up for the funeral and burial fund as {string}', async function (this: E2EWorld, name: string) {
  const email = uniqueEmail('funeral');
  this.data.funeralEmail = email;
  this.cleanup.push(async () => admin.from('funeral_fund_interest').delete().eq('email', email));
  await this.page.goto('/funeral-burials');
  await this.page.getByLabel('Full Name').fill(name);
  await this.page.getByLabel('Email').fill(email);
  await this.page.getByLabel('Phone').fill('2065550111');
  await this.page.getByRole('button', { name: 'Submit' }).click();
});

Then('my interest in the funeral and burial fund should be recorded', async function (this: E2EWorld) {
  await expect
    .poll(async () => (await admin.from('funeral_fund_interest').select('email').eq('email', this.data.funeralEmail)).data?.length)
    .toBe(1);
});

Then('every link in the programs section should open a page that exists', async function (this: E2EWorld) {
  const section = this.page.locator('section, div').filter({ has: this.page.getByRole('heading', { name: 'Our Programs & Services' }) }).last();
  const hrefs = await section.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const res = await this.page.request.get(href);
    expect(res.status(), `${href} answered ${res.status()}`).toBeLessThan(400);
  }
});

Then('every link on the page should open a page that exists', async function (this: E2EWorld) {
  // Same-site links only; requests share the browser's cookies, so admin pages load as the admin.
  await this.page.waitForLoadState('networkidle');
  const hrefs = await this.page
    .locator('a[href^="/"]')
    .evaluateAll((links) => Array.from(new Set(links.map((a) => a.getAttribute("href")!))));
  expect(hrefs.length).toBeGreaterThan(0);
  const dead: string[] = [];
  for (const href of hrefs) {
    const res = await this.page.request.get(href);
    if (res.status() >= 400) dead.push(`${href} → ${res.status()}`);
  }
  expect(dead, `dead links on ${new URL(this.page.url()).pathname}`).toEqual([]);
});

Then('I should see the election in the list as {string}', async function (this: E2EWorld, status: string) {
  const row = this.page.getByRole('row').filter({ hasText: this.election!.title });
  await expect(row).toContainText(status);
  await expect(row.getByRole('link', { name: 'Results' })).toHaveAttribute('href', `/elections/${this.election!.id}/results`);
});

// ---------------------------------------------------------------- account

When('I change my name to {string}', async function (this: E2EWorld, name: string) {
  await this.page.goto('/account');
  await this.page.getByPlaceholder('Your name').fill(name);
  await this.page.getByRole('button', { name: 'Update Name' }).click();
});

Then('my account name should be {string}', async function (this: E2EWorld, name: string) {
  await expect.poll(async () => (await admin.from('users').select('full_name').eq('id', this.me!.id).single()).data?.full_name).toBe(name);
});

Then('I should see the contribution plans {string}, {string} and {string}', async function (this: E2EWorld, a: string, b: string, c: string) {
  for (const plan of [a, b, c]) await expect(this.page.getByRole('heading', { name: plan, exact: true })).toBeVisible();
});

// ---------------------------------------------------------------- webhook

When(
  /^someone posts a "checkout.session.completed" notification for the donation (without a signature|with a forged signature)$/,
  async function (this: E2EWorld, how: string) {
    this.response = await postWebhook(checkoutCompleted({ type: 'donation', donation_id: this.donation!.id }, 5000), {
      signature: how === 'without a signature' ? 'none' : 'invalid',
    });
  }
);

When('Stripe sends a signed {string} notification', async function (this: E2EWorld, type: string) {
  this.response = await postWebhook({ type, data: { object: { id: 'cus_e2e_unhandled', object: 'customer' } } });
});

Then('the webhook should answer {int}', async function (this: E2EWorld, status: number) {
  expect(this.response!.status, this.response!.body).toBe(status);
});

Then('the webhook should answer with success', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBeLessThan(300);
});

Then('the donation should still be pending', async function (this: E2EWorld) {
  const { data } = await admin.from('donations').select('donation_status').eq('id', this.donation!.id).single();
  expect(data?.donation_status).toBe('pending');
});

// ---------------------------------------------------------------- responsive & accessibility

Then('the page should fit the screen width', async function (this: E2EWorld) {
  await this.page.waitForLoadState('networkidle');
  const { scrollWidth, innerWidth } = await this.page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `page is ${scrollWidth}px wide on a ${innerWidth}px screen`).toBeLessThanOrEqual(innerWidth);
});

async function axe(world: E2EWorld) {
  await world.page.waitForLoadState('networkidle');
  return new AxeBuilder({ page: world.page }).withTags(['wcag2a', 'wcag2aa']).analyze();
}

const describe = (v: { id: string; help: string; nodes: unknown[] }[]) =>
  v.map((x) => `${x.id}: ${x.help} (${x.nodes.length} element(s))`).join('\n');

Then('an accessibility scan should find no critical problems', async function (this: E2EWorld) {
  const { violations } = await axe(this);
  const critical = violations.filter((v) => v.impact === 'critical');
  expect(critical, describe(critical)).toEqual([]);
});

Then('an accessibility scan should find no colour-contrast problems', async function (this: E2EWorld) {
  const { violations } = await axe(this);
  const contrast = violations.filter((v) => v.id === 'color-contrast');
  expect(contrast, describe(contrast)).toEqual([]);
});

Then('the page should have exactly one level-1 heading', async function (this: E2EWorld) {
  await this.page.waitForLoadState('networkidle');
  const h1s = await this.page.getByRole('heading', { level: 1 }).allInnerTexts();
  expect(h1s, JSON.stringify(h1s)).toHaveLength(1);
});

When('{string} signs in using only the keyboard', async function (this: E2EWorld, name: string) {
  const user = this.user(name);
  await this.page.goto('/signin/password_signin');
  await this.page.getByLabel('Email').focus();
  await this.page.keyboard.type(user.email);
  await this.page.keyboard.press('Tab');
  await expect(this.page.getByLabel('Password')).toBeFocused();
  await this.page.keyboard.type(user.password);
  await this.page.keyboard.press('Enter');
  await expect(this.page).not.toHaveURL(/\/signin/);
});

// ---------------------------------------------------------------- empty states (@serial)

Given('there are no current elections', async function () {
  const { data } = await admin.from('elections').select('title').gt('end_date', new Date().toISOString());
  expect(data, 'current elections left in the e2e database (another scenario did not clean up?)').toEqual([]);
});

Given('there are no active fundraisers', async function () {
  const { data } = await admin.from('fundraisers').select('title').eq('status', 'active');
  expect(data, 'active fundraisers left in the e2e database (another scenario did not clean up?)').toEqual([]);
});

Then('BCS Seattle should receive a message from {string}', async function (this: E2EWorld, email: string) {
  // The contact form's mail is delivered to the e2e stack's Mailpit (BUG-031).
  await expect
    .poll(async () => {
      const res = await fetch(`${env.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"contact@bcsseattle.test"`)}`);
      if (!res.ok) return 0;
      const body = (await res.json()) as { messages?: { Subject: string; Created: string }[] };
      return body.messages?.filter((m) => m.Subject.includes(`(${email})`) && m.Created >= this.data.sentAfter).length ?? 0;
    }, { timeout: 20_000 })
    .toBeGreaterThan(0);
});
