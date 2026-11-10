import { randomBytes, randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/** Service-role client: bypasses RLS. Only for arranging and inspecting test data. */
export const admin: SupabaseClient = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A client acting as an ordinary signed-in user (RLS applies). */
export async function clientAs(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(env.supabaseUrl, env.anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`sign in as ${user.email}: ${error.message}`);
  return client;
}

export const anonClient = (): SupabaseClient =>
  createClient(env.supabaseUrl, env.anonKey, { auth: { persistSession: false } });

export type Cleanup = Array<() => Promise<unknown>>;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  memberId?: string;
}

/** Unwraps a supabase-js result or throws with context. Untyped on purpose: no generated types here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function must(res: { data: any; error: { message: string } | null }, what: string): any {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data == null) throw new Error(`${what}: no data returned`);
  return res.data;
}

export const uniqueEmail = (label = 'user') =>
  `e2e-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 8)}@example.test`;

export const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

// ---------------------------------------------------------------- users

/**
 * Confirmed auth user. Production's on_auth_user_created trigger creates the
 * matching public.users row (recreated in e2e/supabase/seed.sql).
 */
export async function createUser(
  cleanup: Cleanup,
  opts: { fullName?: string; email?: string; isAdmin?: boolean } = {}
): Promise<TestUser> {
  const fullName = opts.fullName ?? `E2E User ${randomUUID().slice(0, 6)}`;
  const email = opts.email ?? uniqueEmail(fullName);
  const password = `Pw-${randomUUID()}`;
  const { user } = must(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
    'create auth user'
  );
  cleanup.push(() => deleteUser(user.id));
  if (opts.isAdmin) {
    must(await admin.from('users').update({ is_admin: true }).eq('id', user.id).select('id').single(), 'make admin');
  }
  return { id: user.id, email, password, fullName };
}

/** Deletes a user and everything that blocks deleting them (non-cascading FKs). */
export async function deleteUser(userId: string): Promise<void> {
  // Fundraiser donations are keyed by the donor's email, not their user id.
  const email = (await admin.auth.admin.getUserById(userId)).data.user?.email;
  if (email) {
    const { data: fDonors } = await admin.from('fundraiser_donors').select('id').eq('email', email);
    const fDonorIds = (fDonors ?? []).map((d) => d.id);
    if (fDonorIds.length) {
      await admin.from('fundraiser_donations').delete().in('fundraiser_donor_id', fDonorIds);
      await admin.from('fundraiser_donors').delete().in('id', fDonorIds);
    }
  }
  const { data: donors } = await admin.from('donors').select('id').eq('user_id', userId);
  const donorIds = (donors ?? []).map((d) => d.id);
  if (donorIds.length) {
    await admin.from('donations').delete().in('donor_id', donorIds);
    await admin.from('donors').delete().in('id', donorIds);
  }
  await admin.from('fundraisers').delete().eq('created_by', userId);
  await admin.from('fundraiser_updates').delete().eq('created_by', userId);
  await admin.from('candidates').delete().eq('user_id', userId);
  const { data: members } = await admin.from('members').select('id').eq('user_id', userId);
  if (members?.length) await admin.from('invoices').delete().in('member_id', members.map((m) => m.id));
  await admin.from('members').delete().eq('user_id', userId);
  await admin.from('subscriptions').delete().eq('user_id', userId);
  await admin.from('customers').delete().eq('id', userId);
  await admin.from('audit_logs').delete().eq('user_id', userId);
  await admin.from('users').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}

/** For flows where the app itself creates the account (sign-up, guest donation). */
export async function deleteUserByEmail(email: string): Promise<void> {
  const { data: donors } = await admin.from('donors').select('id').eq('email', email);
  for (const d of donors ?? []) {
    await admin.from('donations').delete().eq('donor_id', d.id);
    await admin.from('donors').delete().eq('id', d.id);
  }
  const id = await findAuthUserId(email);
  if (id) await deleteUser(id);
}

export async function findAuthUserId(email: string): Promise<string | undefined> {
  // perPage 1000 is plenty for the e2e stack; every scenario cleans up after itself.
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
}

// ---------------------------------------------------------------- members

export type MemberState = 'approved' | 'pending' | 'inactive' | 'rejected';

export async function createMember(
  user: TestUser,
  state: MemberState,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  // What the app writes for each state today (utils/membership/handlers.ts).
  const status = { approved: 'active', pending: 'pending', inactive: 'inactive', rejected: 'rejected' }[state];
  const row = must(
    await admin
      .from('members')
      .insert({
        user_id: user.id,
        fullName: user.fullName,
        phone: '206-555-0123',
        address: '1 Test Street',
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
        membershipType: 'Individual',
        totalMembersInFamily: 1,
        terms: true,
        status,
        isApproved: state === 'approved',
        ...overrides,
      })
      .select('id')
      .single(),
    'create member'
  );
  user.memberId = row.id;
  return row.id;
}

export async function getMember(userId: string) {
  return (await admin.from('members').select('*').eq('user_id', userId).maybeSingle()).data;
}

// ---------------------------------------------------------------- elections

/**
 * review: nominations have closed and the ballot isn't locked yet.
 * counting: the ballot is locked and voting has just closed, not yet certified.
 */
export type ElectionWindow = 'open' | 'closed' | 'upcoming' | 'nominations' | 'review' | 'counting';

export async function createElection(
  cleanup: Cleanup,
  opts: {
    window: ElectionWindow;
    title?: string;
    candidates?: { full_name: string; position: string; user_id?: string }[];
    initiatives?: string[];
    /** Seats per position (1 unless given). */
    seats?: Record<string, number>;
  }
) {
  // Status holds what an admin decided; the dates decide what is open. The ballot
  // is filled while scheduled, then moved to its final status (it freezes once locked).
  const { status, ...dates } = {
    open: { start_date: hoursFromNow(-1), end_date: hoursFromNow(24), status: 'ballot_locked' },
    closed: { start_date: hoursFromNow(-48), end_date: hoursFromNow(-24), status: 'completed' },
    upcoming: { start_date: hoursFromNow(48), end_date: hoursFromNow(72), status: 'ballot_locked' },
    nominations: {
      start_date: hoursFromNow(48),
      end_date: hoursFromNow(72),
      nomination_start: hoursFromNow(-1),
      nomination_end: hoursFromNow(24),
      status: 'scheduled',
    },
    counting: { start_date: hoursFromNow(-48), end_date: hoursFromNow(-1), status: 'ballot_locked' },
    review: {
      start_date: hoursFromNow(48),
      end_date: hoursFromNow(72),
      nomination_start: hoursFromNow(-48),
      nomination_end: hoursFromNow(-1),
      status: 'scheduled',
    },
  }[opts.window] as { status: 'ballot_locked' | 'completed' | 'scheduled'; start_date: string; end_date: string };
  const title = opts.title ?? `E2E Election ${randomUUID().slice(0, 6)}`;
  const election = must(
    await admin
      .from('elections')
      .insert({ title, type: 'leadership', description: 'Created by the e2e suite', status: 'scheduled', ...dates })
      .select('id')
      .single(),
    'create election'
  );
  cleanup.push(async () => {
    await admin.from('elections').delete().eq('id', election.id); // takes its ballot and votes with it
  });

  // The seeded type template has President, Secretary and Treasurer; any other
  // position a scenario uses is added to this election's ballot.
  const titles = Array.from(new Set([...(opts.candidates ?? []).map((c) => c.position), ...Object.keys(opts.seats ?? {})]));
  for (const title of titles) {
    const seats = opts.seats?.[title] ?? 1;
    const { data: existing } = await admin.from('ballot_positions').select('id').eq('election_id', election.id).eq('title', title).maybeSingle();
    must(
      existing
        ? await admin.from('ballot_positions').update({ seats }).eq('id', existing.id).select('id').single()
        : await admin.from('ballot_positions').insert({ election_id: election.id, title, seats, display_order: 10 }).select('id').single(),
      'ballot position'
    );
  }

  const candidates = opts.candidates?.length
    ? must(
        await admin
          .from('candidates')
          .insert(opts.candidates.map((c) => ({ ...c, election_id: election.id, bio: `${c.full_name} bio` })))
          .select('id, full_name, position'),
        'create candidates'
      )
    : [];
  const initiatives = opts.initiatives?.length
    ? must(
        await admin
          .from('initiatives')
          .insert(opts.initiatives.map((t, i) => ({ election_id: election.id, title: t, ballot_order: i + 1 })))
          .select('id, title'),
        'create initiatives'
      )
    : [];
  if (status !== 'scheduled') {
    // Locking takes the voter roll (approved, active members); members created
    // later in the scenario are added by addToVoterRoll.
    must(await admin.from('elections').update({ status }).eq('id', election.id).select('id').single(), 'set election status');
  }
  return { id: election.id, title, candidates, initiatives };
}

/**
 * Test setup only: changes the ballot of a locked election by reopening it for
 * the change (the ballot freezes at lock for every role, the service role included).
 */
export async function whileBallotOpen<T>(electionId: string, change: () => PromiseLike<T>): Promise<T> {
  const { status } = must(await admin.from('elections').select('status').eq('id', electionId).single(), 'read status');
  if (status === 'scheduled' || status === 'draft') return change();
  must(await admin.from('elections').update({ status: 'scheduled' }).eq('id', electionId).select('id').single(), 'reopen ballot');
  try {
    return await change();
  } finally {
    await admin.from('elections').update({ status }).eq('id', electionId);
  }
}

/**
 * Puts a member on an election's voter roll, as if they had been an approved,
 * active member when its ballot was locked (the roll is taken then).
 */
export async function addToVoterRoll(userId: string, electionId: string) {
  must(
    await admin.from('election_voters').upsert({ election_id: electionId, user_id: userId }).select('user_id').single(),
    'add to voter roll'
  );
}

/** Records a completed candidate ballot directly, as the vote API would. */
export async function castCandidateVotes(userId: string, electionId: string, candidateIds: string[]) {
  const session = must(
    await admin
      .from('vote_sessions')
      .insert({
        user_id: userId,
        election_id: electionId,
        session_type: 'candidates',
        confirmation_code: randomBytes(16).toString('hex').toUpperCase(),
        votes_cast: candidateIds.length,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single(),
    'create vote session'
  );
  must(
    await admin
      .from('votes')
      .insert(
        candidateIds.map((candidate_id) => ({
          user_id: userId,
          election_id: electionId,
          candidate_id,
          session_id: session.id,
          vote_type: 'candidates',
        }))
      )
      .select('id'),
    'insert votes'
  );
}

// ---------------------------------------------------------------- fundraisers

export async function createFundraiser(
  cleanup: Cleanup,
  creator: TestUser,
  overrides: Record<string, unknown> = {}
) {
  const row = must(
    await admin
      .from('fundraisers')
      .insert({
        title: `E2E Fundraiser ${randomUUID().slice(0, 6)}`,
        description: 'Helping a family in our community with unexpected costs.',
        goal_amount: 1000,
        current_amount: 0,
        status: 'active',
        category: 'community',
        ends_at: hoursFromNow(24 * 30),
        created_by: creator.id,
        ...overrides,
      })
      .select('id, title, goal_amount, current_amount')
      .single(),
    'create fundraiser'
  );
  cleanup.push(async () => admin.from('fundraisers').delete().eq('id', row.id));
  return row as { id: string; title: string; goal_amount: number; current_amount: number };
}

// ---------------------------------------------------------------- donations

export async function createDonation(
  cleanup: Cleanup,
  opts: { email?: string; fullName?: string; amountCents: number; status?: 'pending' | 'completed'; userId?: string; anonymous?: boolean; private?: boolean; paymentMethod?: string }
) {
  const email = opts.email ?? uniqueEmail('donor');
  const donor = must(
    await admin
      .from('donors')
      .insert({
        donor_type: 'individual',
        email,
        full_name: opts.fullName ?? 'E2E Donor',
        phone: '206-555-0199',
        address: '2 Giving Way',
        city: 'Seattle',
        state: 'WA',
        zip_code: '98101',
        user_id: opts.userId ?? null,
      })
      .select('id')
      .single(),
    'create donor'
  );
  const donation = must(
    await admin
      .from('donations')
      .insert({
        donor_id: donor.id,
        is_anonymous: opts.anonymous ?? false,
        is_private: opts.private ?? false,
        donation_amount: opts.amountCents,
        donation_type: 'one_time',
        donation_status: opts.status ?? 'completed',
        payment_method: opts.paymentMethod ?? 'card',
        purpose: 'general-purpose',
        donation_description: 'Donation',
      })
      .select('id')
      .single(),
    'create donation'
  );
  cleanup.push(async () => {
    await admin.from('donations').delete().eq('id', donation.id);
    await admin.from('donors').delete().eq('id', donor.id);
  });
  return { id: donation.id as string, donor_email: email };
}
