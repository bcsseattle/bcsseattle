/**
 * Test Utilities for Voting Feature
 * Common test helpers and mock data
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types_db'

export const TEST_CONFIG = {
  SUPABASE_URL: process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SUPABASE_SERVICE_KEY: process.env.TEST_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
}

export interface TestElection {
  id: string
  title: string
  description: string
  type: 'leadership' | 'initiative' | 'board'
  start_date: string
  end_date: string
  status: 'voting_open' | 'voting_closed' | 'draft'
  is_active: boolean
}

export interface TestCandidate {
  id: string
  election_id: string
  user_id: string
  full_name: string
  position: string
  bio: string
}

export interface TestInitiative {
  id: string
  election_id: string
  title: string
  description: string
  ballot_order: number
}

export interface TestMember {
  user_id: string
  status: 'active' | 'inactive'
  membership_type: 'Individual' | 'Family'
}

/**
 * Create test Supabase clients
 */
export function createTestClients() {
  const supabase = createClient<Database>(
    TEST_CONFIG.SUPABASE_URL,
    TEST_CONFIG.SUPABASE_ANON_KEY
  )

  const serviceSupabase = createClient<Database>(
    TEST_CONFIG.SUPABASE_URL,
    TEST_CONFIG.SUPABASE_SERVICE_KEY
  )

  return { supabase, serviceSupabase }
}

/**
 * Generate mock JWT token for testing authentication
 */
export function generateMockJWT(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(JSON.stringify({ 
    sub: userId, 
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600 
  })).toString('base64')
  const signature = 'mock-signature'
  
  return `${header}.${payload}.${signature}`
}

/**
 * Generate unique test confirmation code
 */
export function generateTestConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 15).toUpperCase()
}

/**
 * Create test election with all required data
 */
export async function createTestElection(
  serviceSupabase: ReturnType<typeof createClient<Database>>,
  overrides: Partial<TestElection> = {}
): Promise<TestElection> {
  const election: TestElection = {
    id: `test-election-${Date.now()}`,
    title: 'Test Election',
    description: 'Test election for unit testing',
    type: 'leadership',
    start_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    end_date: new Date(Date.now() + 3600000).toISOString(),   // 1 hour from now
    status: 'voting_open',
    is_active: true,
    ...overrides
  }

  const { error } = await serviceSupabase.from('elections').insert(election)
  if (error) throw error

  return election
}

/**
 * Create test candidate
 */
export async function createTestCandidate(
  serviceSupabase: ReturnType<typeof createClient<Database>>,
  electionId: string,
  overrides: Partial<TestCandidate> = {}
): Promise<TestCandidate> {
  const candidate: TestCandidate = {
    id: `test-candidate-${Date.now()}`,
    election_id: electionId,
    user_id: `test-user-${Date.now()}`,
    full_name: 'Test Candidate',
    position: 'President',
    bio: 'Test candidate bio',
    ...overrides
  }

  const { error } = await serviceSupabase.from('candidates').insert(candidate)
  if (error) throw error

  return candidate
}

/**
 * Create test initiative
 */
export async function createTestInitiative(
  serviceSupabase: ReturnType<typeof createClient<Database>>,
  electionId: string,
  overrides: Partial<TestInitiative> = {}
): Promise<TestInitiative> {
  const initiative: TestInitiative = {
    id: `test-initiative-${Date.now()}`,
    election_id: electionId,
    title: 'Test Initiative',
    description: 'Test initiative description',
    ballot_order: 1,
    ...overrides
  }

  const { error } = await serviceSupabase.from('initiatives').insert(initiative)
  if (error) throw error

  return initiative
}

/**
 * Create test member
 */
export async function createTestMember(
  serviceSupabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  overrides: Partial<TestMember> = {}
): Promise<TestMember> {
  const member: TestMember = {
    user_id: userId,
    status: 'active',
    membership_type: 'Individual',
    ...overrides
  }

  const { error } = await serviceSupabase.from('members').insert(member)
  if (error) throw error

  return member
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  serviceSupabase: ReturnType<typeof createClient<Database>>,
  electionId: string
) {
  // Clean up in reverse order of dependencies
  await serviceSupabase.from('votes').delete().eq('election_id', electionId)
  await serviceSupabase.from('vote_confirmations').delete().eq('election_id', electionId)
  await serviceSupabase.from('candidates').delete().eq('election_id', electionId)
  await serviceSupabase.from('initiatives').delete().eq('election_id', electionId)
  await serviceSupabase.from('elections').delete().eq('id', electionId)
}

/**
 * Assert vote record structure
 */
export function assertVoteStructure(vote: any) {
  expect(vote).toHaveProperty('id')
  expect(vote).toHaveProperty('election_id')
  expect(vote).toHaveProperty('user_id')
  expect(vote).toHaveProperty('voted_at')
  expect(vote).toHaveProperty('ip_address')
  expect(vote).toHaveProperty('user_agent')
  
  // Vote should have either candidate_id OR initiative_id, not both
  if (vote.candidate_id) {
    expect(vote.initiative_id).toBeNull()
    expect(vote.vote_value).toBeNull()
  } else if (vote.initiative_id) {
    expect(vote.candidate_id).toBeNull()
    expect(['yes', 'no', 'abstain']).toContain(vote.vote_value)
  }
}

/**
 * Assert confirmation record structure
 */
export function assertConfirmationStructure(confirmation: any) {
  expect(confirmation).toHaveProperty('id')
  expect(confirmation).toHaveProperty('user_id')
  expect(confirmation).toHaveProperty('election_id')
  expect(confirmation).toHaveProperty('confirmation_code')
  expect(confirmation).toHaveProperty('votes_cast')
  expect(confirmation).toHaveProperty('confirmed_at')
  
  expect(typeof confirmation.confirmation_code).toBe('string')
  expect(confirmation.confirmation_code.length).toBeGreaterThan(0)
  expect(typeof confirmation.votes_cast).toBe('number')
  expect(confirmation.votes_cast).toBeGreaterThan(0)
}

/**
 * Mock Next.js request object
 */
export function createMockRequest(
  method: string = 'POST',
  body?: any,
  headers: Record<string, string> = {}
) {
  return {
    method,
    json: jest.fn().mockResolvedValue(body),
    headers: new Map(Object.entries({
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'Jest Test Agent',
      ...headers
    }))
  }
}

/**
 * Mock Supabase client for unit tests
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(),
    rpc: jest.fn()
  }
}

/**
 * Wait for async operations (useful for testing timing-sensitive code)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate test data factories
 */
export const TestDataFactory = {
  election: (overrides: Partial<TestElection> = {}): TestElection => ({
    id: `test-election-${Date.now()}-${Math.random()}`,
    title: 'Test Election',
    description: 'Test election description',
    type: 'leadership',
    start_date: new Date(Date.now() - 3600000).toISOString(),
    end_date: new Date(Date.now() + 3600000).toISOString(),
    status: 'voting_open',
    is_active: true,
    ...overrides
  }),

  candidate: (electionId: string, overrides: Partial<TestCandidate> = {}): TestCandidate => ({
    id: `test-candidate-${Date.now()}-${Math.random()}`,
    election_id: electionId,
    user_id: `test-user-${Date.now()}-${Math.random()}`,
    full_name: 'Test Candidate',
    position: 'President',
    bio: 'Test candidate biography',
    ...overrides
  }),

  initiative: (electionId: string, overrides: Partial<TestInitiative> = {}): TestInitiative => ({
    id: `test-initiative-${Date.now()}-${Math.random()}`,
    election_id: electionId,
    title: 'Test Initiative',
    description: 'Test initiative description',
    ballot_order: 1,
    ...overrides
  }),

  member: (userId: string, overrides: Partial<TestMember> = {}): TestMember => ({
    user_id: userId,
    status: 'active',
    membership_type: 'Individual',
    ...overrides
  })
}
