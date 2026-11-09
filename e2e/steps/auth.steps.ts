import { Then, When } from '@cucumber/cucumber';
import { messageSettled } from '../support/auth';
import { deleteUserByEmail, findAuthUserId, uniqueEmail } from '../support/db';
import { env } from '../support/env';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

async function submitPasswordSignIn(world: E2EWorld, email: string, password: string) {
  // Already on a sign-in page (e.g. sent there by middleware): stay, keeping ?redirectTo.
  // /signin itself forwards to the default password view.
  if (!/\/signin/.test(world.page.url())) await world.page.goto('/signin/password_signin');
  await expect(world.page).toHaveURL(/\/signin\/password_signin/);
  await world.page.getByLabel('Email').fill(email);
  await world.page.getByLabel('Password').fill(password);
  await world.page.getByRole('button', { name: 'Sign in' }).click();
}

When('{string} signs in with the correct password', async function (this: E2EWorld, name: string) {
  this.me = this.user(name);
  await submitPasswordSignIn(this, this.me.email, this.me.password);
  await expect(this.page).not.toHaveURL(/\/signin/);
  await messageSettled(this.page); // the toast stays visible after the URL is cleaned
});

When('{string} signs in with the password {string}', async function (this: E2EWorld, name: string, password: string) {
  await submitPasswordSignIn(this, this.user(name).email, password);
});

/** Stubs the "attacker" host so open-redirect checks never make real external requests. */
async function stubExternalHost(world: E2EWorld) {
  await world.context.route((url) => url.hostname === 'evil.example', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>evil</h1>' }));
}

When('{string} signs in from a link that asks to return to {string}', async function (this: E2EWorld, name: string, target: string) {
  this.me = this.user(name);
  await stubExternalHost(this);
  await this.page.goto(`/signin/password_signin?redirectTo=${encodeURIComponent(target)}`);
  await submitPasswordSignIn(this, this.me.email, this.me.password);
});

When('I open a sign-in link that asks to return to {string}', async function (this: E2EWorld, target: string) {
  await stubExternalHost(this);
  await this.page.goto(`/signin/password_signin?redirectTo=${encodeURIComponent(target)}`);
});

When('I sign out', async function (this: E2EWorld) {
  await this.page.goto('/');
  await this.page.getByRole('navigation').getByRole('button', { name: 'Membership', exact: true }).click();
  await this.page.getByRole('button', { name: 'Sign out' }).click();
});

// ---------------------------------------------------------------- sign up / passwords

/** Clicks "Sign up" and waits for the server action's redirect (success or ?error=). */
async function submitSignUp(world: E2EWorld) {
  await world.page.getByRole('button', { name: 'Sign up' }).click();
  await world.page.waitForURL((url) => url.pathname.startsWith('/register') || url.searchParams.has('error'));
  await messageSettled(world.page);
}

When('I sign up with a new email address and the password {string}', async function (this: E2EWorld, password: string) {
  const email = uniqueEmail('signup');
  this.cleanup.push(() => deleteUserByEmail(email));
  this.users.newcomer = { id: '', email, password, fullName: '' };
  await this.page.goto('/signin/signup');
  await this.page.getByLabel('Email').fill(email);
  await this.page.getByLabel('Password').fill(password);
  await submitSignUp(this);
});

When('I sign up again with {string}\'s email address', async function (this: E2EWorld, name: string) {
  await this.page.goto('/signin/signup');
  await this.page.getByLabel('Email').fill(this.user(name).email);
  await this.page.getByLabel('Password').fill('another-password');
  await submitSignUp(this);
});

Then('an account should exist for my new email address', async function (this: E2EWorld) {
  await expect.poll(() => findAuthUserId(this.users.newcomer.email)).toBeTruthy();
});

When('{string} asks for a password reset', async function (this: E2EWorld, name: string) {
  await this.page.goto('/signin/forgot_password');
  await this.page.getByLabel('Email').fill(this.user(name).email);
  await this.page.getByRole('button', { name: 'Send Email' }).click();
});

Then('{string} should receive a password reset email', async function (this: E2EWorld, name: string) {
  const email = this.user(name).email;
  // Mailpit (Supabase's local inbox) search API.
  await expect
    .poll(async () => {
      const res = await fetch(`${env.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
      if (!res.ok) return 0;
      const body = (await res.json()) as { messages?: { Subject: string }[] };
      return body.messages?.filter((m) => /reset/i.test(m.Subject)).length ?? 0;
    }, { timeout: 20_000 })
    .toBeGreaterThan(0);
});

When('I change my password to {string} confirmed as {string}', async function (this: E2EWorld, password: string, confirmation: string) {
  await this.page.goto('/signin/update_password');
  await this.page.getByLabel('New Password', { exact: true }).fill(password);
  await this.page.getByLabel('Confirm New Password').fill(confirmation);
  await this.page.getByRole('button', { name: 'Update Password' }).click();
  await this.page.waitForLoadState('networkidle');
});

Then('my password should still be the original one', async function (this: E2EWorld) {
  const res = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email: this.me!.email, password: this.me!.password }),
  });
  expect(res.status, 'signing in with the original password').toBe(200);
});
