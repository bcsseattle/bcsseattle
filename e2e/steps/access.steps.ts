import { Given, Then, When } from '@cucumber/cucumber';
import { admin, anonClient, castCandidateVotes, clientAs, createDonation, getMember } from '../support/db';
import { env } from '../support/env';
import { expect } from '../support/expect';
import { givePaidContribution } from '../support/stripe';
import type { E2EWorld } from '../support/world';

const thisYear = new Date().getFullYear();

Given('{string} has paid a contribution this year', async function (this: E2EWorld, name: string) {
  await givePaidContribution(this.cleanup, this.user(name));
});

Given('{string} has made a donation', async function (this: E2EWorld, name: string) {
  const u = this.user(name);
  this.donation = await createDonation(this.cleanup, { email: u.email, fullName: u.fullName, amountCents: 5000, userId: u.id });
});

async function guestDonation(world: E2EWorld, name: string, dollars: number, flags: { anonymous?: boolean; private?: boolean } = {}) {
  // Suffix: members see every guest donation, and scenarios run in parallel.
  world.data.guestName = `${name} ${Math.random().toString(36).slice(2, 6)}`;
  world.donation = await createDonation(world.cleanup, { fullName: world.data.guestName, amountCents: dollars * 100, ...flags });
}
Given('a guest named {string} has donated ${int}', async function (this: E2EWorld, name: string, dollars: number) {
  await guestDonation(this, name, dollars);
});
Given('a guest named {string} has donated ${int} anonymously', async function (this: E2EWorld, name: string, dollars: number) {
  await guestDonation(this, name, dollars, { anonymous: true });
});
Given('a guest named {string} has made a private ${int} donation', async function (this: E2EWorld, name: string, dollars: number) {
  await guestDonation(this, name, dollars, { private: true });
});

When('{string} reads that donation through the public API', async function (this: E2EWorld, reader: string) {
  const client = await clientAs(this.user(reader));
  this.rows = await client.from('donations').select('donation_amount, donors(full_name)').eq('id', this.donation!.id);
});

Then('they should see the ${int} donation from that guest', async function (this: E2EWorld, dollars: number) {
  expect(this.rows?.data, JSON.stringify(this.rows?.error)).toEqual([{ donation_amount: dollars * 100, donors: { full_name: this.data.guestName } }]);
});

Then('they should see the ${int} donation but not who gave it', async function (this: E2EWorld, dollars: number) {
  expect(this.rows?.data, JSON.stringify(this.rows?.error)).toEqual([{ donation_amount: dollars * 100, donors: null }]);
});

Then('they should not see that donation', async function (this: E2EWorld) {
  expect(this.rows?.data ?? []).toHaveLength(0);
});

When(/^I request the contribution statement of "([^"]+)" (for this year|without choosing a year)$/, async function (this: E2EWorld, name: string, which: string) {
  const memberId = this.user(name).memberId;
  const query = which === 'for this year' ? `?taxYear=${thisYear}` : '';
  const res = await this.page.request.get(`/account/${memberId}/contributions/pdf${query}`, { maxRedirects: 0 });
  this.response = { status: res.status(), body: `${res.headers()['content-type']}\n${res.headers()['location'] ?? ''}` };
});

Then('I should receive a PDF document', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(200);
  expect(this.response!.body).toContain('application/pdf');
});

Then('I should not receive a PDF document', async function (this: E2EWorld) {
  expect(this.response!.body).not.toContain('application/pdf');
});

When('I open the member details page of {string}', async function (this: E2EWorld, name: string) {
  await this.page.goto(`/members/${this.user(name).memberId}`);
});

Then('I should not see {string}\'s name', async function (this: E2EWorld, name: string) {
  await this.page.waitForLoadState('networkidle');
  await expect(this.page.getByText(this.user(name).fullName)).toHaveCount(0);
});

Then('I should see {string}\'s details and total contributions', async function (this: E2EWorld, name: string) {
  await expect(this.page.getByText(this.user(name).fullName).first()).toBeVisible();
  await expect(this.page.getByText('Total Contributions')).toBeVisible();
});

// ---------------------------------------------------------------- direct API access

When('{string} reads the account record of {string} through the public API', async function (this: E2EWorld, reader: string, owner: string) {
  const client = await clientAs(this.user(reader));
  this.rows = await client.from('users').select('id, full_name').eq('id', this.user(owner).id);
});

When('an anonymous visitor reads the {string} table through the public API', async function (this: E2EWorld, table: string) {
  this.rows = await anonClient().from(table).select('*').limit(5);
});

Then('no record should be returned', async function (this: E2EWorld) {
  expect(this.rows?.data ?? [], JSON.stringify(this.rows?.data?.slice(0, 1))).toHaveLength(0);
});

When('{string} sets their own account to admin through the public API', async function (this: E2EWorld, name: string) {
  const u = this.user(name);
  await (await clientAs(u)).from('users').update({ is_admin: true }).eq('id', u.id);
});

Then('{string} should not be an admin', async function (this: E2EWorld, name: string) {
  const { data } = await admin.from('users').select('is_admin').eq('id', this.user(name).id).single();
  expect(data?.is_admin).toBe(false);
});

When('{string} marks their own membership as approved through the public API', async function (this: E2EWorld, name: string) {
  const u = this.user(name);
  await (await clientAs(u)).from('members').update({ isApproved: true, status: 'active' }).eq('user_id', u.id);
});

Then('{string}\'s membership should still be awaiting approval', async function (this: E2EWorld, name: string) {
  expect((await getMember(this.user(name).id))?.isApproved).toBe(false);
});

When('{string} inserts a vote for {string} directly through the public API', async function (this: E2EWorld, voter: string, candidate: string) {
  const u = this.user(voter);
  const c = this.election!.candidates.find((x) => x.full_name === candidate)!;
  const { error } = await (await clientAs(u))
    .from('votes')
    .insert({ user_id: u.id, election_id: this.election!.id, candidate_id: c.id, vote_type: 'candidates' });
  this.apiError = error?.message;
});

Then('the vote should be rejected', async function (this: E2EWorld) {
  const { count } = await admin.from('votes').select('id', { count: 'exact', head: true }).eq('election_id', this.election!.id);
  expect(count, `insert error: ${this.apiError ?? 'none'}`).toBe(0);
});

When('an anonymous caller asks the site to send a payment-failed email to {string}', async function (this: E2EWorld, to: string) {
  const res = await fetch(`${env.baseUrl}/api/send-email/payment-failed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: to, name: 'Victim', amount: '$60', retryUrl: 'https://evil.example/pay', failureMessage: 'x' }),
  });
  this.response = { status: res.status, body: await res.text() };
});

Then('the request should be refused before any email is attempted', async function (this: E2EWorld) {
  // The e2e env gives Resend a dummy key, so an *attempted* send comes back as
  // Resend's "API key is invalid" (also a 401). A real auth check refuses first.
  expect([401, 403], this.response!.body).toContain(this.response!.status);
  expect(this.response!.body, 'the endpoint tried to send the email').not.toMatch(/API key is invalid|validation_error/);
});

When('I request the voting security report', async function (this: E2EWorld) {
  const res = await this.page.request.get('/api/elections/security');
  this.response = { status: res.status(), body: (await res.text()).slice(0, 300) };
});

Then('the request should be refused', async function (this: E2EWorld) {
  expect([401, 403], this.response!.body).toContain(this.response!.status);
});

When('an anonymous visitor calls the {string} database function', async function (this: E2EWorld, fn: string) {
  const { data, error } = await anonClient().rpc(fn);
  this.apiError = error?.message ?? '';
  this.rows = { data: (data as unknown[]) ?? null, error };
});

Then('the call should be refused', async function (this: E2EWorld) {
  expect(this.apiError, `returned ${JSON.stringify(this.rows?.data)}`).toMatch(/permission denied/);
});

Then('I should get the voting security report', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(200);
  expect(this.response!.body).toContain('securityStatus');
});

// ---------------------------------------------------------------- election permissions (BUG-046)

const candidateNamed = (world: E2EWorld, name: string) => world.election!.candidates.find((c) => c.full_name === name)!;

Given('{string} is standing as {string}', async function (this: E2EWorld, user: string, candidate: string) {
  const { error } = await admin.from('candidates').update({ user_id: this.user(user).id }).eq('id', candidateNamed(this, candidate).id);
  expect(error).toBeNull();
});

Given('{string} has voted for {string}', async function (this: E2EWorld, voter: string, candidate: string) {
  await castCandidateVotes(this.user(voter).id, this.election!.id, [candidateNamed(this, candidate).id]);
});

When('{string} withdraws as {string} through the public API', async function (this: E2EWorld, user: string, candidate: string) {
  const { error } = await (await clientAs(this.user(user))).from('candidates').delete().eq('id', candidateNamed(this, candidate).id);
  this.apiError = error?.message ?? '';
});

Then('{string} should still be on the ballot', async function (this: E2EWorld, candidate: string) {
  const { count } = await admin.from('candidates').select('id', { count: 'exact', head: true }).eq('id', candidateNamed(this, candidate).id);
  expect(count, this.apiError).toBe(1);
});

Then('{string} should no longer be on the ballot', async function (this: E2EWorld, candidate: string) {
  const { count } = await admin.from('candidates').select('id', { count: 'exact', head: true }).eq('id', candidateNamed(this, candidate).id);
  expect(count, this.apiError).toBe(0);
});

Then('the vote for {string} should still be counted', async function (this: E2EWorld, candidate: string) {
  const { count } = await admin.from('votes').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateNamed(this, candidate).id);
  expect(count).toBe(1);
});

When('{string} creates an election through the public API', async function (this: E2EWorld, user: string) {
  const u = this.user(user);
  this.data.rogueElection = `Rogue election ${Date.now()}`;
  const { error } = await (await clientAs(u)).from('elections').insert({
    title: this.data.rogueElection,
    type: 'leadership',
    is_active: true,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86_400_000).toISOString(),
    created_by: u.id,
  });
  this.apiError = error?.message ?? '';
  this.cleanup.push(async () => admin.from('elections').delete().eq('title', this.data.rogueElection));
});

Then('no election should have been created', async function (this: E2EWorld) {
  const { count } = await admin.from('elections').select('id', { count: 'exact', head: true }).eq('title', this.data.rogueElection);
  expect(count, this.apiError).toBe(0);
});

// ---------------------------------------------------------------- community funds estimate (BUG-040)

Given(/^a (completed|pending) \$(\d+) (external|card) donation$/, async function (this: E2EWorld, status: 'completed' | 'pending', dollars: string, method: string) {
  await createDonation(this.cleanup, { amountCents: Number(dollars) * 100, status, paymentMethod: method });
});

/** The estimate the page should show with no bank account linked: funds + money received outside Stripe - expenses. */
async function expectedBankEstimateCents() {
  const sum = (rows: { amount?: unknown; donation_amount?: unknown }[] | null, k: 'amount' | 'donation_amount') =>
    (rows ?? []).reduce((acc, r) => acc + Number(r[k] ?? 0), 0);
  const funds = (await admin.from('funds').select('amount').not('status', 'in', '(cancelled,failed)').neq('is_private', true)).data;
  const offline = (await admin.from('donations').select('donation_amount').eq('is_private', false).eq('donation_status', 'completed').not('payment_method', 'in', '(card,us_bank_account)')).data;
  const expenses = (await admin.from('expenses').select('amount').eq('is_private', false)).data;
  return sum(funds, 'amount') + sum(offline, 'donation_amount') - sum(expenses, 'amount');
}

Then('the estimated bank balance should count only money received outside Stripe', async function (this: E2EWorld) {
  // Other scenarios change these tables in parallel: compare until page and database agree.
  await expect
    .poll(async () => {
      await this.page.reload();
      const shown = await this.page.locator('div.rounded-lg, div.rounded-xl').filter({ hasText: /^Bank Balance/ }).locator('.text-2xl').first().innerText();
      const cents = Math.round(Number(shown.replace(/[^0-9.-]/g, '')) * 100);
      return cents === (await expectedBankEstimateCents());
    }, { timeout: 30_000 })
    .toBe(true);
});
