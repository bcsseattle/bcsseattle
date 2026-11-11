import { Given, Then, When } from '@cucumber/cucumber';
import { signInViaUi } from '../support/auth';
import { admin, clientAs } from '../support/db';
import { seriousProblems } from './election-admin-ui.steps';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

async function positionId(world: E2EWorld, title: string) {
  const { data } = await admin.from('ballot_positions').select('id').eq('election_id', world.election!.id).eq('title', title).single();
  return data!.id;
}

async function nominationOf(world: E2EWorld, userId: string, position: string) {
  const { data } = await admin
    .from('nominations')
    .select('id, status, rejection_reason, candidate_id')
    .eq('election_id', world.election!.id)
    .eq('nominee_user_id', userId)
    .eq('position', position)
    .maybeSingle();
  return data;
}

/**
 * A nomination set up directly, as if made through the site: waiting for an
 * answer, waiting for review, or approved (with its candidate).
 */
Given(
  /^there is a nomination of "([^"]+)" for "([^"]+)" (waiting for their answer|waiting for review|on the ballot)$/,
  async function (this: E2EWorld, name: string, position: string, state: string) {
    const nominee = this.user(name);
    const status = { 'waiting for their answer': 'awaiting_acceptance', 'waiting for review': 'submitted', 'on the ballot': 'approved' }[state]!;
    const accepted = status !== 'awaiting_acceptance';
    let candidateId: string | null = null;
    if (status === 'approved') {
      const { data, error } = await admin
        .from('candidates')
        .insert({ election_id: this.election!.id, user_id: nominee.id, full_name: nominee.fullName, position })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      candidateId = data.id;
    }
    const { error } = await admin.from('nominations').insert({
      election_id: this.election!.id,
      nominee_user_id: nominee.id,
      nominated_by: nominee.id,
      ballot_position_id: await positionId(this, position),
      position,
      status,
      full_name: accepted ? nominee.fullName : null,
      bio: accepted ? 'I have served on the events team for three years.' : null,
      candidate_id: candidateId
    });
    if (error) throw new Error(error.message);
  }
);

When('I nominate {string} for {string} with the note {string}', async function (this: E2EWorld, name: string, position: string, note: string) {
  await this.page.goto(`/elections/${this.election!.id}/nominate`);
  await this.page.getByRole('radio', { name: /^Another member/ }).click();
  await this.page.getByLabel('Position').selectOption({ label: position });
  await this.page.getByLabel('Member', { exact: true }).selectOption({ label: this.user(name).fullName });
  await this.page.getByLabel('Note to them').fill(note);
  await this.page.getByRole('button', { name: 'Send nomination' }).click();
});

When(
  'I accept my nomination for {string} with the platform {string}',
  async function (this: E2EWorld, position: string, platform: string) {
    await this.page.goto('/account/nominations');
    await this.page.getByRole('listitem').filter({ hasText: position }).getByRole('link', { name: 'Accept or decline' }).click();
    await this.page.getByLabel('Statement').fill('Ready to serve the community.');
    await this.page.getByLabel('Platform').fill(platform);
    await this.page.getByRole('button', { name: 'Accept nomination' }).click();
  }
);

When('I decline my nomination for {string}', async function (this: E2EWorld, position: string) {
  await this.page.goto('/account/nominations');
  await this.page.getByRole('listitem').filter({ hasText: position }).getByRole('link', { name: 'Accept or decline' }).click();
  await this.page.getByRole('button', { name: 'Decline' }).click();
});

When('I withdraw my nomination for {string}', async function (this: E2EWorld, position: string) {
  await this.page.goto('/account/nominations');
  await this.page.getByRole('listitem').filter({ hasText: position }).getByRole('button', { name: 'Withdraw' }).click();
  await this.page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw nomination' }).click();
});

When(/^I (approve|reject) "([^"]+)"'s nomination(?: because "([^"]+)")?$/, async function (this: E2EWorld, decision: string, name: string, reason?: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=nominations`);
  const row = this.page.getByRole('listitem').filter({ hasText: this.user(name).fullName });
  await row.getByRole('button', { name: decision === 'approve' ? 'Approve' : 'Reject' }).click();
  const sheet = this.page.getByRole('alertdialog');
  if (reason) await sheet.getByLabel('Reason').fill(reason);
  await sheet.getByRole('button', { name: decision === 'approve' ? 'Approve nomination' : 'Reject nomination' }).click();
});

When('I add {string} as a candidate for {string}', async function (this: E2EWorld, fullName: string, position: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=nominations`);
  const form = this.page.getByRole('region', { name: 'Add a candidate' });
  await form.getByLabel('Position').selectOption({ label: position });
  await form.getByLabel('Name on the ballot').fill(fullName);
  await form.getByRole('button', { name: 'Add candidate' }).click();
});

const STATUS: Record<string, string> = {
  'waiting for their answer': 'awaiting_acceptance',
  'waiting for review': 'submitted',
  'on the ballot': 'approved',
  declined: 'declined',
  'not approved': 'rejected',
  withdrawn: 'withdrawn'
};

Then(
  /^(my|"[^"]+"'s) nomination for "([^"]+)" should be (waiting for their answer|waiting for review|on the ballot|declined|not approved|withdrawn)$/,
  async function (this: E2EWorld, who: string, position: string, state: string) {
    const user = who === 'my' ? this.me! : this.user(who.slice(1, who.indexOf('"', 1)));
    await expect.poll(async () => (await nominationOf(this, user.id, position))?.status).toBe(STATUS[state]);
  }
);

Then('{string} should be a candidate for {string}', async function (this: E2EWorld, name: string, position: string) {
  await expect
    .poll(async () => (await admin.from('candidates').select('position').eq('election_id', this.election!.id).eq('user_id', this.user(name).id)).data)
    .toEqual([{ position }]);
});

Then('{string} should not be a candidate', async function (this: E2EWorld, name: string) {
  await expect
    .poll(async () => (await admin.from('candidates').select('id').eq('election_id', this.election!.id).eq('user_id', this.user(name).id)).data)
    .toEqual([]);
});

Then('there should be a candidate named {string} for {string}', async function (this: E2EWorld, fullName: string, position: string) {
  await expect
    .poll(async () => (await admin.from('candidates').select('position').eq('election_id', this.election!.id).eq('full_name', fullName)).data)
    .toEqual([{ position }]);
});

// ---------------------------------------------------------------- the database's own checks

When(
  /^"([^"]+)" (approves|accepts) "([^"]+)"'s nomination for "([^"]+)" through the public API$/,
  async function (this: E2EWorld, caller: string, verb: string, nominee: string, position: string) {
    const n = await nominationOf(this, this.user(nominee).id, position);
    const client = await clientAs(this.user(caller));
    const { error } =
      verb === 'approves'
        ? await client.rpc('nomination_decide', { p_nomination: n!.id, p_approve: true })
        : await client.rpc('nomination_respond', { p_nomination: n!.id, p_accept: true, p_full_name: 'Someone Else' });
    this.apiError = error?.message ?? '';
  }
);

When(
  '{string} nominates {string} for {string} through the public API',
  async function (this: E2EWorld, caller: string, nominee: string, position: string) {
    const { error } = await (await clientAs(this.user(caller))).rpc('nomination_create', {
      p_election: this.election!.id,
      p_position: await positionId(this, position),
      p_nominee: this.user(nominee).id
    });
    this.apiError = error?.message ?? '';
  }
);

When('I sign in instead as {string}', async function (this: E2EWorld, name: string) {
  await this.context.clearCookies();
  this.me = this.user(name);
  await signInViaUi(this.page, this.me);
});

Then(
  'each nomination page should have no serious accessibility problems and fit the screen',
  async function (this: E2EWorld) {
    const n = await nominationOf(this, this.me!.id, 'President');
    const paths = [
      `/elections/${this.election!.id}/nominate`,
      '/account/nominations',
      `/elections/${this.election!.id}/nominations/${n!.id}`
    ];
    for (const path of paths) {
      await this.page.goto(path);
      expect(await seriousProblems(this.page), path).toEqual([]);
      const { scrollWidth, innerWidth } = await this.page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }));
      expect(scrollWidth, `${path} is wider than the screen`).toBeLessThanOrEqual(innerWidth);
    }
  }
);
