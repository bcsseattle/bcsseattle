import { Given, Then, When } from '@cucumber/cucumber';
import { admin, castCandidateVotes, createElection, createUser, type ElectionWindow } from '../support/db';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

Given(
  /^there is an? (open|closed|upcoming|nominations) election with candidates "([^"]+)" and "([^"]+)" for "([^"]+)"$/,
  async function (this: E2EWorld, window: ElectionWindow, a: string, b: string, position: string) {
    this.election = await createElection(this.cleanup, {
      window,
      candidates: [
        { full_name: a, position },
        { full_name: b, position },
      ],
    });
  }
);

Given('there is an open election with the initiative {string}', async function (this: E2EWorld, title: string) {
  this.election = await createElection(this.cleanup, { window: 'open', initiatives: [title] });
});

Given('there is an election accepting nominations', async function (this: E2EWorld) {
  this.election = await createElection(this.cleanup, { window: 'nominations' });
});

Given('I have already voted for {string}', async function (this: E2EWorld, name: string) {
  await castCandidateVotes(this.me!.id, this.election!.id, [candidate(this, name).id]);
});

/** The election page's ballot: Review votes, Submit ballot, then confirm in the dialog. */
async function submitBallot(page: E2EWorld['page']) {
  await page.getByRole('button', { name: 'Review votes' }).click();
  await page.getByRole('button', { name: 'Submit ballot' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit ballot' }).click();
  await expect(page.getByRole('heading', { name: 'Your ballot is in' })).toBeVisible();
}

function candidate(world: E2EWorld, name: string) {
  const c = world.election!.candidates.find((x) => x.full_name === name);
  if (!c) throw new Error(`No candidate "${name}" in this scenario's election`);
  return c;
}

When('I open the election', async function (this: E2EWorld) {
  await this.page.goto(`/elections/${this.election!.id}`);
});

When('I open the candidate ballot', async function (this: E2EWorld) {
  await this.page.goto(`/elections/${this.election!.id}/vote/candidates`);
});

Then('the elections list should mark the election as {string}', async function (this: E2EWorld, label: string) {
  // The election's own card: the <article> headed by its title.
  const card = this.page
    .getByRole('article')
    .filter({ has: this.page.getByRole('heading', { name: this.election!.title, exact: true }) });
  await expect(card.getByText(label, { exact: true })).toBeVisible();
});

Then('I should see the election status {string}', async function (this: E2EWorld, status: string) {
  await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible();
});

When('I vote for {string} as {string}', async function (this: E2EWorld, name: string, _position: string) {
  await this.page.goto(`/elections/${this.election!.id}`);
  await this.page.locator(`[id="${candidate(this, name).id}"]`).click();
  await submitBallot(this.page);
  await this.page.getByRole('link', { name: 'View confirmation for leadership positions' }).click();
  await expect(this.page).toHaveURL(/\/vote\/candidates\/confirmation\?code=/);
});

When('I vote {string} on {string}', async function (this: E2EWorld, choice: string, title: string) {
  const initiative = this.election!.initiatives.find((i) => i.title === title)!;
  const prefix = { 'Yes / Support': 'yes', 'No / Oppose': 'no', 'Abstain / No preference': 'abstain' }[choice];
  await this.page.goto(`/elections/${this.election!.id}`);
  await this.page.locator(`[id="${prefix}-${initiative.id}"]`).click();
  await submitBallot(this.page);
  await this.page.getByRole('link', { name: 'View confirmation for community initiatives' }).click();
  await expect(this.page).toHaveURL(/\/vote\/initiatives\/confirmation\?code=/);
});

When('I vote {string} on {string} using the combined ballot', async function (this: E2EWorld, choice: string, title: string) {
  const initiative = this.election!.initiatives.find((i) => i.title === title)!;
  const value = { 'Yes / Support': 'yes', 'No / Oppose': 'no', 'Abstain / No preference': 'abstain' }[choice];
  await this.page.goto(`/elections/${this.election!.id}/vote`);
  await this.page.locator(`[id="${initiative.id}-${value}"]`).click();
  await this.page.getByRole('button', { name: 'Review & Submit' }).click();
  await this.page.getByRole('button', { name: 'Submit Vote' }).click();
  await expect(this.page).toHaveURL(/\/vote\/confirmation/);
});

Then('I should be given a confirmation code', async function (this: E2EWorld) {
  const code = new URL(this.page.url()).searchParams.get('code');
  expect(code).toMatch(/^[A-F0-9]{32}$/);
  await expect(this.page.getByText(code!, { exact: true })).toBeVisible();
});

Then('my vote for {string} should be recorded', async function (this: E2EWorld, name: string) {
  const { data } = await admin.from('votes').select('candidate_id').eq('user_id', this.me!.id).eq('election_id', this.election!.id);
  expect(data).toEqual([{ candidate_id: candidate(this, name).id }]);
});

Then('my {string} vote on {string} should be recorded', async function (this: E2EWorld, value: string, title: string) {
  const initiative = this.election!.initiatives.find((i) => i.title === title)!;
  const { data } = await admin.from('votes').select('vote_value').eq('user_id', this.me!.id).eq('initiative_id', initiative.id);
  expect(data).toEqual([{ vote_value: value }]);
});

Then('I should not be offered a ballot', async function (this: E2EWorld) {
  await this.page.waitForLoadState('networkidle');
  await expect(this.page.getByRole('radio')).toHaveCount(0);
  await expect(this.page.getByRole('button', { name: 'Review Votes' })).toHaveCount(0);
});

When('I submit a ballot for both {string} and {string}, labelling one with another position', async function (this: E2EWorld, a: string, b: string) {
  const res = await this.page.request.post(`/api/elections/${this.election!.id}/vote/candidates`, {
    data: {
      candidateVotes: [
        { candidateId: candidate(this, a).id, position: 'President' },
        { candidateId: candidate(this, b).id, position: 'Treasurer' },
      ],
    },
  });
  this.response = { status: res.status(), body: await res.text() };
});

When('I submit the combined ballot with a vote for {string}', async function (this: E2EWorld, name: string) {
  const res = await this.page.request.post(`/api/elections/${this.election!.id}/vote`, {
    data: { candidateVotes: [{ candidateId: candidate(this, name).id, position: 'President' }], initiativeVotes: [] },
  });
  expect(res.status(), await res.text()).toBe(200);
});

When('I submit the candidate ballot with a vote for {string}', async function (this: E2EWorld, name: string) {
  const res = await this.page.request.post(`/api/elections/${this.election!.id}/vote/candidates`, {
    data: { candidateVotes: [{ candidateId: candidate(this, name).id, position: 'President' }] },
  });
  this.response = { status: res.status(), body: await res.text() };
});

Given('candidate voting for the election only starts tomorrow', async function (this: E2EWorld) {
  // Only the start is set: separate periods come from the leadership type's default.
  const { error } = await admin
    .from('elections')
    .update({ candidate_voting_start: new Date(Date.now() + 86_400_000).toISOString() })
    .eq('id', this.election!.id);
  expect(error).toBeNull();
});

Then('the ballot should be refused as not open yet', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(400);
  expect(this.response!.body).toContain('not currently open');
});

Then('the ballot should be refused as already voted', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(400);
  expect(this.response!.body).toContain('already voted');
});

Then('only my vote for {string} should be counted', async function (this: E2EWorld, name: string) {
  const { data } = await admin.from('votes').select('candidate_id').eq('election_id', this.election!.id).eq('user_id', this.me!.id);
  expect(data).toEqual([{ candidate_id: candidate(this, name).id }]);
});

Then('no votes should be recorded for the election', async function (this: E2EWorld) {
  const { count } = await admin.from('votes').select('id', { count: 'exact', head: true }).eq('election_id', this.election!.id);
  expect(count, `API said ${this.response?.status}: ${this.response?.body}`).toBe(0);
});

When('I open the elections list with a feature override that skips the membership check', async function (this: E2EWorld) {
  const override = encodeURIComponent(JSON.stringify({ features: { skipMembershipCheck: true } }));
  await this.page.goto(`/elections?configoverride=${override}`);
});

// ---------------------------------------------------------------- nominations

When('I open the nomination page', async function (this: E2EWorld) {
  await this.page.goto(`/elections/${this.election!.id}/nominate`);
});

When('I nominate myself for {string} with the platform {string}', async function (this: E2EWorld, position: string, platform: string) {
  await this.page.goto(`/elections/${this.election!.id}/nominate`);
  const form = this.page.getByRole('button', { name: 'Submit Nomination' });
  // The page first shows "Checking nomination status...", then the form or a refusal.
  const refused = this.page.getByText(/Already Nominated|Nominations (are )?Closed|not (currently )?open/i);
  await expect(form.or(refused).first()).toBeVisible({ timeout: 20_000 });
  if (!(await form.isVisible())) return; // refused up front: nothing to submit
  await this.page.getByRole('combobox').click();
  await this.page.getByRole('option', { name: position, exact: true }).click();
  await this.page.getByLabel(/Short Bio/).fill('Long-time volunteer at community events.');
  await this.page.getByLabel(/Your Platform/).fill(platform);
  await form.click();
  await this.page.waitForURL((url) => !url.pathname.endsWith('/nominate') || url.searchParams.has('error'), { timeout: 20_000 }).catch(() => {});
});

Given('I have already nominated myself for {string}', async function (this: E2EWorld, position: string) {
  const { error } = await admin
    .from('candidates')
    .insert({ election_id: this.election!.id, user_id: this.me!.id, full_name: this.me!.fullName, position });
  if (error) throw new Error(error.message);
});

async function myCandidacies(world: E2EWorld) {
  const { data } = await admin.from('candidates').select('position').eq('election_id', world.election!.id).eq('user_id', world.me!.id);
  return data ?? [];
}

Then('I should be listed as a candidate for {string}', async function (this: E2EWorld, position: string) {
  expect(await myCandidacies(this)).toEqual([{ position }]);
});

Then('I should not be listed as a candidate', async function (this: E2EWorld) {
  expect(await myCandidacies(this)).toEqual([]);
});

// ---------------------------------------------------------------- results

/** Each vote needs its own voter: votes are unique per (voter, candidate) and one ballot per voter. */
async function giveVotes(world: E2EWorld, candidateId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const voter = await createUser(world.cleanup, { fullName: `Voter ${i}` });
    await castCandidateVotes(voter.id, world.election!.id, [candidateId]);
  }
}

Given(/^"([^"]+)" received (\d+) votes? and "([^"]+)" received (\d+) votes?$/, async function (this: E2EWorld, a: string, na: string, b: string, nb: string) {
  await giveVotes(this, candidate(this, a).id, Number(na));
  await giveVotes(this, candidate(this, b).id, Number(nb));
});

Given(/^"([^"]+)" is the only candidate for "([^"]+)" and received (\d+) votes$/, async function (this: E2EWorld, name: string, position: string, n: string) {
  const { data, error } = await admin
    .from('candidates')
    .insert({ election_id: this.election!.id, full_name: name, position })
    .select('id, full_name, position')
    .single();
  if (error) throw new Error(error.message);
  this.election!.candidates.push(data);
  await giveVotes(this, data.id, Number(n));
});

Given("the page's clock is under the test's control", async function (this: E2EWorld) {
  await this.page.clock.install();
});

When('another member votes for {string}', async function (this: E2EWorld, name: string) {
  await giveVotes(this, candidate(this, name).id, 1);
});

When('{int} seconds pass', async function (this: E2EWorld, seconds: number) {
  await this.page.clock.runFor(seconds * 1000);
});

When('I open the election results', async function (this: E2EWorld) {
  await this.page.goto(`/elections/${this.election!.id}/results`);
  await expect(this.page.getByRole('heading', { name: 'Election Results' })).toBeVisible();
});

When('I open the {string} tab', async function (this: E2EWorld, name: string) {
  await this.page.getByRole('tab', { name }).click();
});

Given('the election is still a draft', async function (this: E2EWorld) {
  const { error } = await admin.from('elections').update({ status: 'draft' }).eq('id', this.election!.id);
  expect(error).toBeNull();
});

Then('the results should not be found', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(404);
});

Then('the results should need sign-in', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(401);
});

When('I fetch the published results of the election', async function (this: E2EWorld) {
  const res = await this.page.request.get(`/api/elections/${this.election!.id}/results`);
  this.response = { status: res.status(), body: await res.text() };
});

When('I fetch the candidate results as a member', async function (this: E2EWorld) {
  const res = await this.page.request.get(`/api/elections/${this.election!.id}/candidate-results`);
  this.response = { status: res.status(), body: await res.text() };
});

/** Finds the result object for a candidate anywhere in a results payload. */
function resultFor(body: string, name: string): Record<string, number> | undefined {
  let found: Record<string, number> | undefined;
  JSON.parse(body, (_k, v) => {
    if (v && typeof v === 'object' && (v.fullName === name || v.full_name === name)) found ??= v;
    return v;
  });
  return found;
}

Then(/^"([^"]+)" should have ([\d.]+) percent of the "[^"]+" vote$/, async function (this: E2EWorld, name: string, pct: string) {
  expect(this.response!.status, this.response!.body.slice(0, 200)).toBe(200);
  expect(resultFor(this.response!.body, name)?.percentage).toBeCloseTo(Number(pct), 1);
});

Then(/^"([^"]+)" should have (\d+) votes$/, async function (this: E2EWorld, name: string, n: string) {
  expect(this.response!.status, this.response!.body.slice(0, 200)).toBe(200);
  const r = resultFor(this.response!.body, name);
  expect(r?.vote_count ?? r?.voteCount, JSON.stringify(r)).toBe(Number(n));
});
