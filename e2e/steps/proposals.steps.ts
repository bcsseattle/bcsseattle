import { Given, Then, When } from '@cucumber/cucumber';
import { admin, clientAs, createElection } from '../support/db';
import { seriousProblems } from './election-admin-ui.steps';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

const EXPLANATION = 'Volunteers would run it every Saturday, and the general fund would pay for the room.';

async function proposal(world: E2EWorld, title: string) {
  const { data } = await admin
    .from('initiative_proposals')
    .select('id, status, rejection_reason, initiative_id, proposed_by')
    .eq('election_id', world.election!.id)
    .eq('title', title)
    .maybeSingle();
  return data;
}

Given('there is an election whose nominations have closed, with the initiative {string}', async function (this: E2EWorld, title: string) {
  this.election = await createElection(this.cleanup, { window: 'review', initiatives: [title] });
  // The seeded positions have no candidates: mark them vacant so only proposals stand in the way of the lock.
  const { error } = await admin.from('ballot_positions').update({ vacant: true }).eq('election_id', this.election.id);
  expect(error).toBeNull();
});

/** Proposals set up directly, as if made through the site. */
Given(
  /^"([^"]+)" has proposed the initiative "([^"]+)"(?:, waiting for review)?$/,
  async function (this: E2EWorld, name: string, title: string) {
    const { error } = await admin
      .from('initiative_proposals')
      .insert({ election_id: this.election!.id, proposed_by: this.user(name).id, title, description: EXPLANATION });
    if (error) throw new Error(error.message);
  }
);

Given('{string} has proposed {int} initiatives', async function (this: E2EWorld, name: string, count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    election_id: this.election!.id,
    proposed_by: this.user(name).id,
    title: `Should BCS try idea number ${i + 1}?`,
    description: EXPLANATION
  }));
  const { error } = await admin.from('initiative_proposals').insert(rows);
  if (error) throw new Error(error.message);
});

When('I propose the example {string}', async function (this: E2EWorld, title: string) {
  await this.page.goto(`/elections/${this.election!.id}`);
  await this.page.getByRole('link', { name: 'Propose an initiative' }).click();
  await this.page.getByRole('button', { name: title }).click();
  await expect(this.page.getByLabel('Question')).toHaveValue(title);
  await this.page.getByRole('button', { name: 'Propose initiative' }).click();
});

When('I propose the initiative {string} explained as {string}', async function (this: E2EWorld, title: string, explanation: string) {
  await this.page.goto(`/elections/${this.election!.id}/propose`);
  await this.page.getByLabel('Question').fill(title);
  await this.page.getByLabel('Explanation').fill(explanation);
  await this.page.getByRole('button', { name: 'Propose initiative' }).click();
});

When(/^I (approve|reject) the initiative "([^"]+)"(?: because "([^"]+)")?$/, async function (this: E2EWorld, decision: string, title: string, reason?: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=nominations`);
  const row = this.page.getByRole('listitem').filter({ hasText: title });
  await row.getByRole('button', { name: decision === 'approve' ? 'Approve' : 'Reject' }).click();
  const sheet = this.page.getByRole('alertdialog');
  if (reason) await sheet.getByLabel('Reason').fill(reason);
  await sheet.getByRole('button', { name: decision === 'approve' ? 'Approve initiative' : 'Reject initiative' }).click();
});

When('I withdraw my initiative {string}', async function (this: E2EWorld, title: string) {
  const p = await proposal(this, title);
  await this.page.goto(`/elections/${this.election!.id}/proposals/${p!.id}`);
  await this.page.getByRole('button', { name: 'Withdraw' }).click();
  await this.page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw proposal' }).click();
});

const STATUS: Record<string, string> = {
  'waiting for review': 'submitted',
  'on the ballot': 'approved',
  'not approved': 'rejected',
  withdrawn: 'withdrawn'
};

Then(
  /^the initiative "([^"]+)" should be (waiting for review|on the ballot|not approved|withdrawn)$/,
  async function (this: E2EWorld, title: string, state: string) {
    await expect.poll(async () => (await proposal(this, title))?.status).toBe(STATUS[state]);
  }
);

Then(/^the ballot should( not)? include the initiative "([^"]+)"$/, async function (this: E2EWorld, not: string | undefined, title: string) {
  const { data } = await admin.from('initiatives').select('title').eq('election_id', this.election!.id).eq('title', title);
  expect(data ?? []).toHaveLength(not ? 0 : 1);
});

// ---------------------------------------------------------------- the database's own checks

When('{string} proposes an initiative through the public API', async function (this: E2EWorld, name: string) {
  const { error } = await (await clientAs(this.user(name))).rpc('initiative_propose', {
    p_election: this.election!.id,
    p_title: 'Should BCS start a book club?',
    p_description: EXPLANATION
  });
  this.apiError = error?.message ?? '';
});

When('{string} adds a proposal directly through the public API', async function (this: E2EWorld, name: string) {
  const { error } = await (await clientAs(this.user(name)))
    .from('initiative_proposals')
    .insert({ election_id: this.election!.id, proposed_by: this.user(name).id, title: 'Should BCS start a book club?', description: EXPLANATION });
  this.apiError = error?.message ?? '';
});

Then('{string} should see no initiative proposals through the public API', async function (this: E2EWorld, name: string) {
  const { data, error } = await (await clientAs(this.user(name))).from('initiative_proposals').select('id').eq('election_id', this.election!.id);
  expect(error).toBeNull();
  expect(data).toEqual([]);
});

Then('the propose page should have no serious accessibility problems and fit the screen', async function (this: E2EWorld) {
  const path = `/elections/${this.election!.id}/propose`;
  await this.page.goto(path);
  expect(await seriousProblems(this.page), path).toEqual([]);
  const { scrollWidth, innerWidth } = await this.page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(scrollWidth, `${path} is wider than the screen`).toBeLessThanOrEqual(innerWidth);
});

When('{string} approves the initiative {string} through the public API', async function (this: E2EWorld, name: string, title: string) {
  const p = await proposal(this, title);
  const { error } = await (await clientAs(this.user(name))).rpc('initiative_proposal_decide', { p_proposal: p!.id, p_approve: true });
  expect(error).toBeNull();
});
