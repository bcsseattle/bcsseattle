import { Given, Then, When } from '@cucumber/cucumber';
import { admin, clientAs, createElection } from '../support/db';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

const minutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

Given(
  'there is an election being counted with candidates {string} and {string} for {string}',
  async function (this: E2EWorld, a: string, b: string, position: string) {
    this.election = await createElection(this.cleanup, {
      window: 'counting',
      candidates: [
        { full_name: a, position },
        { full_name: b, position }
      ]
    });
  }
);

/**
 * Moves the election's clock (its dates) to the next moment of its life. The
 * service role can, as SQL could; signed-in admins move dates only with Extend.
 */
When(/^time passes until (nominations open|nominations close|voting opens|voting closes)$/, async function (this: E2EWorld, moment: string) {
  const dates = {
    'nominations open': { nomination_start: minutes(-60), nomination_end: minutes(60), start_date: minutes(120), end_date: minutes(180) },
    'nominations close': { nomination_start: minutes(-120), nomination_end: minutes(-1), start_date: minutes(60), end_date: minutes(120) },
    'voting opens': { nomination_start: minutes(-180), nomination_end: minutes(-120), start_date: minutes(-1), end_date: minutes(60) },
    'voting closes': { nomination_start: minutes(-300), nomination_end: minutes(-240), start_date: minutes(-120), end_date: minutes(-1) }
  }[moment]!;
  const { error } = await admin
    .from('elections')
    .update({ ...dates, candidate_voting_start: null, candidate_voting_end: null })
    .eq('id', this.election!.id);
  expect(error).toBeNull();
});

When('I keep the ballot as it is', async function (this: E2EWorld) {
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(this.page).toHaveURL(/step=timeline/);
});

When(
  '{string} nominates themselves for {string} through the public API',
  async function (this: E2EWorld, name: string, position: string) {
    const u = this.user(name);
    const { data: pos } = await admin.from('ballot_positions').select('id').eq('election_id', this.election!.id).eq('title', position).single();
    const { error } = await (await clientAs(u)).rpc('nomination_create', {
      p_election: this.election!.id,
      p_position: pos!.id,
      p_nominee: u.id,
      p_full_name: u.fullName,
      p_bio: 'Long-time volunteer.'
    });
    expect(error, error?.message).toBeNull();
  }
);

async function bearer(world: E2EWorld, name: string) {
  const { data } = await (await clientAs(world.user(name))).auth.getSession();
  return { Authorization: `Bearer ${data.session!.access_token}` };
}

When('{string} votes for {string} through the vote API', async function (this: E2EWorld, voter: string, candidateName: string) {
  const fullName = this.users[candidateName]?.fullName ?? candidateName;
  const { data: c } = await admin.from('candidates').select('id').eq('election_id', this.election!.id).eq('full_name', fullName).single();
  const res = await this.page.request.post(`/api/elections/${this.election!.id}/vote/candidates`, {
    headers: await bearer(this, voter),
    data: { candidateVotes: [{ candidateId: c!.id, position: 'ignored' }] }
  });
  expect(res.status(), await res.text()).toBe(200);
});

When('I certify the results', async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=results`);
  await this.page.getByRole('button', { name: 'Certify results' }).click();
  await this.page.getByRole('alertdialog').getByRole('button', { name: 'Certify results' }).click();
});

When('I publish the results', async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=results`);
  await this.page.getByRole('button', { name: 'Publish results' }).click();
  await this.page.getByRole('alertdialog').getByRole('button', { name: 'Publish results' }).click();
});

When('I start a run-off for {string}', async function (this: E2EWorld, position: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=results`);
  await this.page.getByRole('region', { name: position }).getByRole('button', { name: 'Start a run-off' }).click();
  await this.page.getByRole('alertdialog').getByRole('button', { name: 'Create run-off' }).click();
});

Then(
  'a run-off for {string} should exist between {string} and {string}',
  async function (this: E2EWorld, position: string, a: string, b: string) {
    await expect
      .poll(async () => {
        const { data } = await admin
          .from('elections')
          .select('status, ballot_positions(title, seats), candidates(full_name)')
          .eq('runoff_of', this.election!.id)
          .maybeSingle();
        if (!data) return null;
        // Clean up with the original (runoff_of is set null when it goes, so delete it too).
        return {
          status: data.status,
          positions: data.ballot_positions.map((p) => p.title),
          candidates: data.candidates.map((c) => c.full_name).sort()
        };
      })
      .toEqual({ status: 'draft', positions: [position], candidates: [a, b].sort() });
    this.cleanup.push(async () => admin.from('elections').delete().eq('runoff_of', this.election!.id));
  }
);

Then('the CSV of the results should list {string} as {string}', async function (this: E2EWorld, name: string, result: string) {
  const res = await this.page.request.get(`/admin/elections/${this.election!.id}/results.csv`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/csv');
  const fullName = this.users[name]?.fullName ?? name;
  const lines = (await res.text()).split('\r\n');
  expect(lines[0]).toBe('Section,Position or initiative,Candidate,Votes,Yes,No,Abstain,Rank,Result,Note');
  expect(lines.some((l) => l.includes(`,${fullName},`) && l.includes(`,${result},`)), lines.join('\n')).toBe(true);
});

Then(
  /^the published results should show "([^"]+)" (elected|elected unopposed) for "([^"]+)"$/,
  async function (this: E2EWorld, name: string, word: string, position: string) {
    const member = Object.keys(this.users).find((n) => n !== name && n !== 'Me admin') ?? name;
    const res = await this.page.request.get(`/api/elections/${this.election!.id}/results`, { headers: await bearer(this, member) });
    const body = await res.json();
    expect(res.status(), JSON.stringify(body)).toBe(200);
    const fullName = this.users[name]?.fullName ?? name;
    const row = body.candidateResults.find((c: { fullName: string; position: string }) => c.fullName === fullName && c.position === position);
    expect(row?.outcome, JSON.stringify(body.candidateResults)).toBe(word === 'elected' ? 'elected' : 'elected_unopposed');
  }
);

Then('the results should wait for certification', async function (this: E2EWorld) {
  expect(this.response!.status, this.response!.body).toBe(403);
  expect(this.response!.body).toContain('certified');
});

When("{string} asks for the count through the public API", async function (this: E2EWorld, name: string) {
  const { error } = await (await clientAs(this.user(name))).rpc('election_outcomes', { p_election: this.election!.id });
  this.apiError = error?.message ?? '';
});

When('I reopen the certification because {string}', async function (this: E2EWorld, reason: string) {
  await this.page.getByRole('button', { name: 'Reopen certification' }).click();
  const sheet = this.page.getByRole('alertdialog');
  await sheet.getByLabel('Reason').fill(reason);
  await sheet.getByRole('button', { name: 'Reopen certification' }).click();
});
