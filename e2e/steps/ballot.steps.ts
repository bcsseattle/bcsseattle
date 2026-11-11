import { Given, Then, When } from '@cucumber/cucumber';
import { admin, clientAs, createElection } from '../support/db';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';
import { candidate, submitBallot } from './elections.steps';
import { arrange } from './common.steps';
import { signInViaUi } from '../support/auth';

Given(
  'there is an election whose nominations have closed, with candidates {string} and {string} for {string}',
  async function (this: E2EWorld, a: string, b: string, position: string) {
    this.election = await createElection(this.cleanup, {
      window: 'review',
      candidates: [
        { full_name: a, position },
        { full_name: b, position }
      ]
    });
  }
);

Given(
  /^there is an open election with candidates "([^"]+)", "([^"]+)" and "([^"]+)" for "([^"]+)" with (\d+) seats$/,
  async function (this: E2EWorld, a: string, b: string, c: string, position: string, seats: string) {
    this.election = await createElection(this.cleanup, {
      window: 'open',
      candidates: [a, b, c].map((full_name) => ({ full_name, position })),
      seats: { [position]: Number(seats) }
    });
  }
);

const tab = async (world: E2EWorld, name: string) => world.page.goto(`/admin/elections/${world.election!.id}?tab=${name}`);
const positionRow = (world: E2EWorld, title: string) =>
  world.page.getByRole('region', { name: 'Positions' }).locator('ul.divide-y > li').filter({ hasText: title });

When('I open the election\'s {string} tab', async function (this: E2EWorld, name: string) {
  await tab(this, name.toLowerCase());
});

When('I mark {string} vacant', async function (this: E2EWorld, title: string) {
  await tab(this, 'ballot');
  await positionRow(this, title).getByRole('button', { name: 'Mark vacant' }).click();
  await expect(positionRow(this, title).getByRole('button', { name: 'Not vacant' })).toBeVisible();
});

When('I lock the ballot', async function (this: E2EWorld) {
  await tab(this, 'ballot');
  await this.page.getByRole('button', { name: 'Lock ballot' }).click();
  await this.page.getByRole('alertdialog').getByRole('button', { name: 'Lock ballot' }).click();
});

/** Moves a deadline one day later through an Extend form on the given tab. */
async function extend(world: E2EWorld, tabName: 'ballot' | 'voting', idPrefix: string, reason: string) {
  await tab(world, tabName);
  const field = world.page.locator(`#${idPrefix}-until`);
  const [date, time] = (await field.inputValue()).split('T');
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  await field.fill(`${next.toISOString().slice(0, 10)}T${time}`);
  await world.page.locator(`#${idPrefix}-reason`).fill(reason);
  await world.page.locator(`#${idPrefix}-until`).locator('xpath=ancestor::form').getByRole('button', { name: 'Extend' }).click();
}

When('I extend nominations by a day because {string}', async function (this: E2EWorld, reason: string) {
  this.data.before = (await admin.from('elections').select('nomination_end').eq('id', this.election!.id).single()).data!.nomination_end!;
  await extend(this, 'ballot', 'extend-nominations', reason);
});

When('I extend voting by a day because {string}', async function (this: E2EWorld, reason: string) {
  this.data.before = (await admin.from('elections').select('end_date').eq('id', this.election!.id).single()).data!.end_date;
  await extend(this, 'voting', 'extend-voting', reason);
});

Then(/^the election's (nominations|voting) should close a day later$/, async function (this: E2EWorld, which: string) {
  const column = which === 'nominations' ? 'nomination_end' : 'end_date';
  await expect
    .poll(async () => {
      const { data } = await admin.from('elections').select(column).eq('id', this.election!.id).single();
      const after = (data as Record<string, string> | null)?.[column];
      // The form works in whole minutes; the fixture's deadline has seconds.
      const moved = after ? Date.parse(after) - Date.parse(this.data.before) : 0;
      return moved > 24 * 3600_000 - 60_000 && moved <= 24 * 3600_000;
    })
    .toBe(true);
});

When('I mark {string} withdrawn because {string}', async function (this: E2EWorld, name: string, reason: string) {
  await tab(this, 'ballot');
  const row = this.page.getByRole('region', { name: 'Positions' }).locator('li li').filter({ hasText: name });
  await row.getByRole('button', { name: 'Mark withdrawn' }).click();
  const sheet = this.page.getByRole('alertdialog');
  await sheet.getByLabel('Reason').fill(reason);
  await sheet.getByRole('button', { name: 'Mark withdrawn' }).click();
});

Then('{string} should be marked withdrawn', async function (this: E2EWorld, name: string) {
  await expect
    .poll(async () => (await admin.from('candidates').select('withdrawn_at').eq('id', candidate(this, name).id).single()).data?.withdrawn_at)
    .toBeTruthy();
});

Then('the position {string} should be {string}', async function (this: E2EWorld, title: string, state: string) {
  const { data } = await admin.from('ballot_positions').select('vacant, unopposed_decision').eq('election_id', this.election!.id).eq('title', title).single();
  expect(state === 'vacant' ? data?.vacant : data?.unopposed_decision).toBe(state === 'vacant' ? true : state);
});

Then('I shouldn\'t be able to choose {string}', async function (this: E2EWorld, name: string) {
  await expect(this.page.locator(`[id="${candidate(this, name).id}"]`)).toBeDisabled();
});

When(/^I vote for "([^"]+)" and "([^"]+)"$/, async function (this: E2EWorld, a: string, b: string) {
  await this.page.goto(`/elections/${this.election!.id}`);
  await this.page.locator(`[id="${candidate(this, a).id}"]`).click();
  await this.page.locator(`[id="${candidate(this, b).id}"]`).click();
  await submitBallot(this.page);
});

Then(/^my votes for "([^"]+)" and "([^"]+)" should be recorded$/, async function (this: E2EWorld, a: string, b: string) {
  const { data } = await admin.from('votes').select('candidate_id').eq('election_id', this.election!.id).eq('user_id', this.me!.id);
  expect((data ?? []).map((v) => v.candidate_id).sort()).toEqual([candidate(this, a).id, candidate(this, b).id].sort());
});

When(
  '{string} votes for {string}, {string} and {string} through the vote API',
  async function (this: E2EWorld, voter: string, a: string, b: string, c: string) {
    // The website's own endpoint, with the voter's session cookie: the server checks seats.
    const client = await clientAs(this.user(voter));
    const { data } = await client.auth.getSession();
    const res = await this.page.request.post(`/api/elections/${this.election!.id}/vote/candidates`, {
      headers: { Authorization: `Bearer ${data.session!.access_token}` },
      data: { candidateVotes: [a, b, c].map((n) => ({ candidateId: candidate(this, n).id, position: 'ignored' })) }
    });
    this.response = { status: res.status(), body: await res.text() };
  }
);

Then('the vote should be refused with {string}', async function (this: E2EWorld, message: string) {
  expect(this.response!.status, this.response!.body).toBeGreaterThanOrEqual(400);
  expect(this.response!.body).toContain(message);
});

Then('the turnout should show {string} voted for candidates', async function (this: E2EWorld, value: string) {
  await tab(this, 'voting');
  await expect(this.page.getByText('Voted for candidates').locator('..')).toContainText(value);
});

When('I sign in instead as an approved member', async function (this: E2EWorld) {
  await this.context.clearCookies();
  this.me = await arrange(this, 'approved', 'Me approved');
  await signInViaUi(this.page, this.me);
});

When('{string} withdraws candidate {string} through the public API', async function (this: E2EWorld, caller: string, name: string) {
  const { error } = await (await clientAs(this.user(caller))).rpc('election_withdraw_candidate', {
    p_candidate: candidate(this, name).id,
    p_reason: 'Testing'
  });
  this.apiError = error?.message ?? '';
});
