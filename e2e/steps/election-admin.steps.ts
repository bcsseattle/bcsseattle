import { Then, When, Given } from '@cucumber/cucumber';
import { admin, clientAs } from '../support/db';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

/** Each admin function's arguments, valid apart from who is calling. */
const ARGS: Record<string, (election: string) => Record<string, unknown>> = {
  election_publish: (id) => ({ p_election: id }),
  election_lock_ballot: (id) => ({ p_election: id }),
  election_extend: (id) => ({
    p_election: id,
    p_field: 'end_date',
    p_until: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    p_reason: 'More time'
  }),
  election_cancel: (id) => ({ p_election: id, p_reason: 'Testing' }),
  election_publish_results: (id) => ({ p_election: id }),
  election_archive: (id) => ({ p_election: id }),
  election_turnout: (id) => ({ p_election: id })
};

When('{string} looks up the election through the public API', async function (this: E2EWorld, name: string) {
  this.rows = await (await clientAs(this.user(name))).from('elections').select('id').eq('id', this.election!.id);
});

When(
  '{string} calls {string} on the election through the public API',
  async function (this: E2EWorld, name: string, fn: string) {
    const { data, error } = await (await clientAs(this.user(name))).rpc(fn as never, ARGS[fn](this.election!.id) as never);
    this.apiError = error?.message ?? '';
    this.rows = { data: (data as unknown[]) ?? null, error };
  }
);

Then('the call should be refused with {string}', async function (this: E2EWorld, message: string) {
  expect(this.apiError, `returned ${JSON.stringify(this.rows?.data)}`).toContain(message);
});

Then('the election status should (still )be {string}', async function (this: E2EWorld, status: string) {
  const { data } = await admin.from('elections').select('status').eq('id', this.election!.id).single();
  expect(data?.status).toBe(status);
});

When(
  "{string} sets the election's status to {string} through the public API",
  async function (this: E2EWorld, name: string, status: string) {
    const { error } = await (await clientAs(this.user(name)))
      .from('elections')
      .update({ status } as never)
      .eq('id', this.election!.id);
    this.apiError = error?.message ?? '';
  }
);

When(
  '{string} adds the candidate {string} for {string} through the public API',
  async function (this: E2EWorld, name: string, fullName: string, position: string) {
    const { error } = await (await clientAs(this.user(name)))
      .from('candidates')
      .insert({ election_id: this.election!.id, full_name: fullName, position });
    this.apiError = error?.message ?? '';
  }
);

When("{string} asks for the election's turnout through the public API", async function (this: E2EWorld, name: string) {
  const { data, error } = await (await clientAs(this.user(name))).rpc('election_turnout', { p_election: this.election!.id });
  this.apiError = error?.message ?? '';
  this.rows = { data: (data as unknown[]) ?? null, error };
});

Then(
  'the turnout should show {int} candidate voter and nothing about who voted for whom',
  async function (this: E2EWorld, voters: number) {
    expect(this.apiError).toBe('');
    const rows = this.rows!.data as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['eligible', 'voted_candidates', 'voted_initiatives']);
    expect(rows[0].voted_candidates).toBe(voters);
    expect(rows[0].eligible).toBeGreaterThanOrEqual(voters);
  }
);

When("{string} reads the election's votes through the public API", async function (this: E2EWorld, name: string) {
  this.rows = await (await clientAs(this.user(name))).from('votes').select('user_id, candidate_id').eq('election_id', this.election!.id);
});

When("{string} reads the election's activity through the public API", async function (this: E2EWorld, name: string) {
  this.rows = await (await clientAs(this.user(name))).from('election_events').select('id').eq('election_id', this.election!.id);
});

Given("{string} isn't on the voter roll", async function (this: E2EWorld, name: string) {
  const { error } = await admin.from('election_voters').delete().eq('election_id', this.election!.id).eq('user_id', this.user(name).id);
  expect(error).toBeNull();
});

When('{string} opens a candidate ballot through the public API', async function (this: E2EWorld, name: string) {
  const u = this.user(name);
  const { error } = await (await clientAs(u)).from('vote_sessions').insert({
    user_id: u.id,
    election_id: this.election!.id,
    session_type: 'candidates',
    confirmation_code: `E2E${Date.now()}`
  });
  this.apiError = error?.message ?? '';
});

Then('no ballot session should exist for {string}', async function (this: E2EWorld, name: string) {
  const { count } = await admin
    .from('vote_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', this.election!.id)
    .eq('user_id', this.user(name).id);
  expect(count, `insert error: ${this.apiError || 'none'}`).toBe(0);
});

When(
  '{string} nominates themselves for {string} directly through the public API',
  async function (this: E2EWorld, name: string, position: string) {
    const u = this.user(name);
    const { error } = await (await clientAs(u)).from('nominations').insert({
      election_id: this.election!.id,
      nominee_user_id: u.id,
      nominated_by: u.id,
      position,
      status: 'submitted'
    });
    this.apiError = error?.message ?? '';
  }
);

Then('no nomination should exist for {string}', async function (this: E2EWorld, name: string) {
  const { count } = await admin
    .from('nominations')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', this.election!.id)
    .eq('nominee_user_id', this.user(name).id);
  expect(count, `insert error: ${this.apiError || 'none'}`).toBe(0);
});

// The store review account (is_review_account) never goes on a voter roll.
Given('{string} is a store review account', async function (this: E2EWorld, name: string) {
  const { error } = await admin.from('members').update({ is_review_account: true }).eq('user_id', this.user(name).id);
  expect(error).toBeNull();
});

Then(/^"([^"]+)" should( not)? be on the voter roll$/, async function (this: E2EWorld, name: string, not?: string) {
  const { data } = await admin.from('election_voters').select('user_id').eq('election_id', this.election!.id).eq('user_id', this.user(name).id);
  expect(data ?? []).toHaveLength(not ? 0 : 1);
});

When('{string} clears their review account flag through the public API', async function (this: E2EWorld, name: string) {
  const { error } = await (await clientAs(this.user(name))).from('members').update({ is_review_account: false }).eq('user_id', this.user(name).id);
  this.apiError = error?.message ?? '';
});

Then('{string} should still be a store review account', async function (this: E2EWorld, name: string) {
  const { data } = await admin.from('members').select('is_review_account').eq('user_id', this.user(name).id).single();
  expect(data?.is_review_account).toBe(true);
});
