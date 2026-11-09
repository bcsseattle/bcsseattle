import { defineParameterType, Given, Then, When } from '@cucumber/cucumber';
import { signInViaUi, toast } from '../support/auth';
import { createMember, createUser, type MemberState, type TestUser } from '../support/db';
import { env } from '../support/env';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

// ---------------------------------------------------------------- personas

const ROLES = {
  'an approved member': 'approved',
  'a pending applicant': 'pending',
  'an inactive member': 'inactive',
  'a rejected applicant': 'rejected',
  'an admin': 'admin',
  'a user with no membership': 'none',
} as const;
type Role = (typeof ROLES)[keyof typeof ROLES];

defineParameterType({
  name: 'role',
  regexp: new RegExp(Object.keys(ROLES).join('|')),
  transformer: (s: string) => ROLES[s as keyof typeof ROLES],
});

/** Creates a persona. Admins are also approved members, as real admins are. */
export async function arrange(world: E2EWorld, role: Role, name: string): Promise<TestUser> {
  // Shared pages (admin list, directory) show every member, and scenarios run in
  // parallel: a short suffix keeps each persona's display name unique.
  const fullName = `${name} ${Math.random().toString(36).slice(2, 6)}`;
  const user = await createUser(world.cleanup, { fullName, isAdmin: role === 'admin' });
  if (role !== 'none') await createMember(user, role === 'admin' ? 'approved' : (role as MemberState));
  world.users[name] = user;
  return user;
}

Given('I am a visitor who is not signed in', async function () {
  // Fresh browser context per scenario: nothing to do.
});

Given('there is {role} named {string}', async function (this: E2EWorld, role: Role, name: string) {
  await arrange(this, role, name);
});

Given('I am signed in as {role}', async function (this: E2EWorld, role: Role) {
  this.me = await arrange(this, role, `Me ${role}`);
  await signInViaUi(this.page, this.me);
});

Given('I am signed in as {string}', async function (this: E2EWorld, name: string) {
  this.me = this.user(name);
  await signInViaUi(this.page, this.me);
});

// ---------------------------------------------------------------- navigation

const PAGES: Record<string, string> = {
  home: '/',
  'sign-in': '/signin/',
  registration: '/register',
  'membership fee': '/membership-fee',
  account: '/account',
  donate: '/donate',
  elections: '/elections',
  fundraisers: '/fundraisers',
  'member management': '/admin/members',
  'community funds': '/community-funds',
};

function pathRegex(path: string) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return path === '/' ? /^[^?#]*:\/\/[^/]+\/?(\?.*)?$/ : new RegExp(`${escaped}(?:[/?#].*)?$`);
}

When('I go to {string}', async function (this: E2EWorld, path: string) {
  await this.page.goto(path);
});

When('I go to the {word} page', async function (this: E2EWorld, page: string) {
  await this.page.goto(PAGES[page] ?? `/${page}`);
});

Then('I should be on the {string} page', async function (this: E2EWorld, path: string) {
  await expect(this.page).toHaveURL(pathRegex(path));
});

Then(/^I should (?:still )?be on the (home|sign-in|registration|membership fee|account|donate|elections|fundraisers|member management|community funds) page$/, async function (this: E2EWorld, page: string) {
  const path = PAGES[page];
  await expect(this.page).toHaveURL(page === 'sign-in' ? /\/signin(\/|\?|$)/ : pathRegex(path));
});

Then('I should be asked to sign in before reaching {string}', async function (this: E2EWorld, path: string) {
  await expect(this.page).toHaveURL(/\/signin(\/|\?)/);
  await expect(this.page).toHaveURL(new RegExp(`redirectTo=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

Then('I should still be on the BCS Seattle site', async function (this: E2EWorld) {
  // The open redirect happens client-side after /signin loads; checking right
  // after load could pass before it fires. Wait until the page leaves /signin
  // (to wherever it goes), then check where it ended up.
  await this.page
    .waitForURL((u) => !u.pathname.startsWith('/signin'), { timeout: 10_000, waitUntil: 'commit' })
    .catch(() => {});
  await this.page.waitForLoadState();
  expect(new URL(this.page.url()).origin, `ended up on ${this.page.url()}`).toBe(new URL(env.baseUrl).origin);
});

// ---------------------------------------------------------------- page content

Then('I should see the heading {string}', async function (this: E2EWorld, text: string) {
  await expect(this.page.getByRole('heading', { name: text, exact: true }).first()).toBeVisible();
});

Then('I should see {string}', async function (this: E2EWorld, text: string) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('I should not see the heading {string}', async function (this: E2EWorld, text: string) {
  await expect(this.page.getByRole('heading', { name: text, exact: true })).toHaveCount(0);
});

Then('I should not see {string}', async function (this: E2EWorld, text: string) {
  await expect(this.page.getByText(text, { exact: false })).toHaveCount(0);
});

Then('I should see the message {string}', async function (this: E2EWorld, text: string) {
  await expect(toast(this.page, text).first()).toBeVisible();
});

Then('I should see a {string} button', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('button', { name, exact: true }).or(this.page.getByRole('link', { name, exact: true })).first()).toBeVisible();
});

Then('I should not see a {string} button', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('button', { name, exact: true })).toHaveCount(0);
  await expect(this.page.getByRole('link', { name, exact: true })).toHaveCount(0);
});

When('I press {string}', async function (this: E2EWorld, name: string) {
  await this.page.getByRole('button', { name, exact: true }).or(this.page.getByRole('link', { name, exact: true })).first().click();
});

When('I fill in {string} with {string}', async function (this: E2EWorld, label: string, value: string) {
  await this.page.getByLabel(label, { exact: true }).fill(value);
});

Then('the field {string} should show the error {string}', async function (this: E2EWorld, _label: string, message: string) {
  // react-hook-form renders <FormMessage> right under the field.
  await expect(this.page.getByText(message, { exact: true }).first()).toBeVisible();
});

// ---------------------------------------------------------------- navbar

Then('the navigation should offer the {string} menu', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('navigation').getByRole('button', { name, exact: true }).first()).toBeVisible();
});

Then('the navigation should not offer the {string} menu', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('navigation').getByRole('button', { name, exact: true })).toHaveCount(0);
});

Then('the navigation should offer the {string} link', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByRole('link', { name, exact: true }).first()).toBeVisible();
});

When('I open the {string} menu', async function (this: E2EWorld, name: string) {
  await this.page.getByRole('navigation').getByRole('button', { name, exact: true }).first().click();
});

Then('the {string} field should be marked invalid', async function (this: E2EWorld, label: string) {
  // Either the browser's constraint validation (min/max/required) or the form's aria-invalid.
  const field = this.page.getByLabel(label, { exact: true });
  await expect
    .poll(() => field.evaluate((el) => !(el as HTMLInputElement).checkValidity() || el.getAttribute('aria-invalid') === 'true'))
    .toBe(true);
});

When('I follow the {string} link', async function (this: E2EWorld, name: string) {
  await this.page.getByRole('link', { name, exact: true }).first().click();
});

When('I choose {string} from the menu', async function (this: E2EWorld, title: string) {
  // Menu items' accessible names are the title followed by a short description.
  await this.page.getByRole('link', { name: new RegExp(`^${title}`) }).first().click();
});
