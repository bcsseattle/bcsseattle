import { Given, Then, When } from '@cucumber/cucumber';
import { admin, anonClient, clientAs, createDonation, getMember } from '../support/db';
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

When('I request the contribution statement of {string} for this year', async function (this: E2EWorld, name: string) {
  const memberId = this.user(name).memberId;
  const res = await this.page.request.get(`/account/${memberId}/contributions/pdf?taxYear=${thisYear}`, { maxRedirects: 0 });
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
