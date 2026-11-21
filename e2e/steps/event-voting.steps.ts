import { Given, Then, When } from '@cucumber/cucumber';
import { randomUUID } from 'node:crypto';
import { admin, castCandidateVotes, deleteUserByEmail, findAuthUserId } from '../support/db';
import { candidate } from './elections.steps';
import { env } from '../support/env';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

/** Messages Mailpit (the local inbox) holds for this address. */
async function inbox(email: string) {
  const res = await fetch(`${env.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  if (!res.ok) return [];
  return ((await res.json()) as { messages?: { ID: string }[] }).messages ?? [];
}

/**
 * Turns allowGuestVoting on with a row in feature_flags, as an admin would in
 * production: environment-wide, so signed-out visitors get it. Left in place,
 * since scenarios run in parallel and all want it on.
 */
Given('event voting is turned on', async function () {
  const { data } = await admin
    .from('feature_flags')
    .select('id')
    .eq('feature_name', 'allowGuestVoting')
    .eq('environment', 'production')
    .is('user_id', null)
    .is('user_role', null);
  const { error } = data?.length
    ? await admin.from('feature_flags').update({ enabled: true }).in('id', data.map((r) => r.id))
    : await admin.from('feature_flags').insert({ feature_name: 'allowGuestVoting', environment: 'production', enabled: true });
  if (error) throw error;
});

Given('event voting is open for the election', async function (this: E2EWorld) {
  const { error } = await admin.from('elections').update({ event_voting: true }).eq('id', this.election!.id);
  if (error) throw error;
});

Given('event voting is closed for the election', async function (this: E2EWorld) {
  const { error } = await admin.from('elections').update({ event_voting: false }).eq('id', this.election!.id);
  if (error) throw error;
});

Given('{string} has no BCS account', async function (this: E2EWorld, name: string) {
  const email = `e2e-guest-${randomUUID().slice(0, 8)}@example.test`;
  // The page makes the account; its id is filled in once they sign in.
  this.users[name] = { id: '', email, password: '', fullName: name };
  this.cleanup.push(() => deleteUserByEmail(email));
});

Given('{string} has already voted for {string}', async function (this: E2EWorld, name: string, choice: string) {
  await castCandidateVotes(this.user(name).id, this.election!.id, [candidate(this, choice).id]);
});

When('I open the event voting page', async function (this: E2EWorld) {
  await this.page.goto(`/vote/${this.election!.id}`);
});

When('{string} asks for a ballot code at the event', async function (this: E2EWorld, name: string) {
  await this.page.goto(`/vote/${this.election!.id}`);
  await this.page.getByLabel('Email').fill(this.user(name).email);
  await this.page.getByRole('button', { name: 'Send my code' }).click();
  await expect(this.page.getByText('Check your email')).toBeVisible();
});

When('{string} enters the code from the email', async function (this: E2EWorld, name: string) {
  const email = this.user(name).email;
  let code = '';
  await expect
    .poll(async () => {
      for (const m of await inbox(email)) {
        const res = await fetch(`${env.mailpitUrl}/api/v1/message/${m.ID}`);
        const text = ((await res.json()) as { Text?: string }).Text ?? '';
        code = text.match(/\b(\d{6})\b/)?.[1] ?? '';
        if (code) return true;
      }
      return false;
    }, { timeout: 20_000 })
    .toBe(true);
  await this.page.getByLabel('Code').fill(code);
  await this.page.getByRole('button', { name: 'Open my ballot' }).click();
  await expect(this.page).toHaveURL(new RegExp(`/elections/${this.election!.id}`));
  const me = this.user(name);
  if (!me.id) me.id = (await findAuthUserId(email))!;
  this.me = me;
});

When("I open event voting from the election's Voting tab", async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=voting`);
  await this.page.getByRole('button', { name: 'Open event voting' }).click();
  await this.page.getByRole('dialog').or(this.page.getByRole('alertdialog')).getByRole('button', { name: 'Open event voting' }).click();
});

Then('I should see the event QR code', async function (this: E2EWorld) {
  await expect(this.page.getByRole('img', { name: /QR code for .*\/vote\// })).toBeVisible();
});
