/**
 * Database Tests for Voting Feature
 * Tests database functions, RLS policies, and data integrity
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types_db'

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'your-anon-key'
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'your-service-key'

describe('Voting Database Functions', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let serviceSupabase: ReturnType<typeof createClient<Database>>
  
  // Test data
  const testUserId = 'test-user-id'
  const testElectionId = 'test-election-id'
  const testCandidateId = 'test-candidate-id'
  const testInitiativeId = 'test-initiative-id'

  beforeAll(async () => {
    // Initialize Supabase clients
    supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
    serviceSupabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY)
    
    // Setup test data
    await setupTestData()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  describe('user_has_voted_in_election function', () => {
    it('should return false when user has not voted', async () => {
      const { data, error } = await supabase.rpc('user_has_voted_in_election', {
        election_uuid: testElectionId,
        user_uuid: testUserId
      })

      expect(error).toBeNull()
      expect(data).toBe(false)
    })

    it('should return true when user has voted', async () => {
      // Create a test vote
      await serviceSupabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null
      })

      const { data, error } = await supabase.rpc('user_has_voted_in_election', {
        election_uuid: testElectionId,
        user_uuid: testUserId
      })

      expect(error).toBeNull()
      expect(data).toBe(true)
    })
  })

  describe('get_election_vote_count function', () => {
    beforeEach(async () => {
      // Clean votes table
      await serviceSupabase.from('votes').delete().neq('id', 'non-existent')
    })

    it('should return correct vote counts', async () => {
      // Insert test votes
      await serviceSupabase.from('votes').insert([
        {
          election_id: testElectionId,
          user_id: testUserId,
          candidate_id: testCandidateId,
          vote_value: null
        },
        {
          election_id: testElectionId,
          user_id: 'another-user',
          initiative_id: testInitiativeId,
          vote_value: 'yes'
        }
      ])

      const { data, error } = await supabase.rpc('get_election_vote_count', {
        election_uuid: testElectionId
      })

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual({
        candidate_votes: 1,
        initiative_votes: 1,
        total_voters: 2
      })
    })
  })

  describe('user_has_active_membership function', () => {
    it('should return false for inactive member', async () => {
      const { data, error } = await supabase.rpc('user_has_active_membership', {
        user_uuid: testUserId
      })

      expect(error).toBeNull()
      expect(data).toBe(false)
    })

    it('should return true for active member', async () => {
      // Create active membership
      await serviceSupabase.from('members').insert({
        user_id: testUserId,
        status: 'active',
        membership_type: 'Individual'
      })

      const { data, error } = await supabase.rpc('user_has_active_membership', {
        user_uuid: testUserId
      })

      expect(error).toBeNull()
      expect(data).toBe(true)
    })
  })

  describe('Vote constraints and validation', () => {
    beforeEach(async () => {
      await serviceSupabase.from('votes').delete().neq('id', 'non-existent')
    })

    it('should prevent duplicate candidate votes', async () => {
      // Insert first vote
      const { error: firstError } = await serviceSupabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null
      })
      expect(firstError).toBeNull()

      // Try to insert duplicate
      const { error: duplicateError } = await serviceSupabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null
      })
      expect(duplicateError).not.toBeNull()
      expect(duplicateError?.message).toContain('unique')
    })

    it('should prevent duplicate initiative votes', async () => {
      // Insert first vote
      const { error: firstError } = await serviceSupabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        initiative_id: testInitiativeId,
        vote_value: 'yes'
      })
      expect(firstError).toBeNull()

      // Try to insert duplicate
      const { error: duplicateError } = await serviceSupabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        initiative_id: testInitiativeId,
        vote_value: 'no'
      })
      expect(duplicateError).not.toBeNull()
    })

    it('should enforce vote type check constraint', async () => {
      // Try to insert vote with both candidate and initiative
      const { error } = await serviceSupabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        initiative_id: testInitiativeId,
        vote_value: 'yes'
      })
      
      expect(error).not.toBeNull()
      expect(error?.message).toContain('vote_type_check')
    })

    it('should enforce foreign key constraints', async () => {
      // Try to insert vote with non-existent election
      const { error } = await serviceSupabase.from('votes').insert({
        election_id: 'non-existent-election',
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null
      })
      
      expect(error).not.toBeNull()
      expect(error?.message).toContain('foreign key')
    })
  })

  describe('Row Level Security Policies', () => {
    let userSupabase: ReturnType<typeof createClient<Database>>
    let otherUserSupabase: ReturnType<typeof createClient<Database>>

    beforeAll(async () => {
      // Create authenticated user clients (mock authentication)
      userSupabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
        global: {
          headers: {
            'Authorization': `Bearer ${generateMockJWT(testUserId)}`
          }
        }
      })
      
      otherUserSupabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
        global: {
          headers: {
            'Authorization': `Bearer ${generateMockJWT('other-user-id')}`
          }
        }
      })
    })

    it('should allow users to view only their own votes', async () => {
      // Insert votes for different users
      await serviceSupabase.from('votes').insert([
        {
          election_id: testElectionId,
          user_id: testUserId,
          candidate_id: testCandidateId,
          vote_value: null
        },
        {
          election_id: testElectionId,
          user_id: 'other-user-id',
          candidate_id: testCandidateId,
          vote_value: null
        }
      ])

      // User should see only their own votes
      const { data: userVotes, error: userError } = await userSupabase
        .from('votes')
        .select('*')
        .eq('election_id', testElectionId)

      expect(userError).toBeNull()
      expect(userVotes).toHaveLength(1)
      expect(userVotes[0].user_id).toBe(testUserId)

      // Other user should see only their own votes
      const { data: otherVotes, error: otherError } = await otherUserSupabase
        .from('votes')
        .select('*')
        .eq('election_id', testElectionId)

      expect(otherError).toBeNull()
      expect(otherVotes).toHaveLength(1)
      expect(otherVotes[0].user_id).toBe('other-user-id')
    })

    it('should allow anyone to view initiatives', async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('*')
        .eq('election_id', testElectionId)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should allow users to view only their own vote confirmations', async () => {
      // Insert confirmations for different users
      await serviceSupabase.from('vote_confirmations').insert([
        {
          user_id: testUserId,
          election_id: testElectionId,
          confirmation_code: 'CODE123',
          votes_cast: 1
        },
        {
          user_id: 'other-user-id',
          election_id: testElectionId,
          confirmation_code: 'CODE456',
          votes_cast: 1
        }
      ])

      // User should see only their own confirmations
      const { data: userConfirmations, error: userError } = await userSupabase
        .from('vote_confirmations')
        .select('*')
        .eq('election_id', testElectionId)

      expect(userError).toBeNull()
      expect(userConfirmations).toHaveLength(1)
      expect(userConfirmations[0].user_id).toBe(testUserId)
    })
  })

  // Helper functions
  async function setupTestData() {
    // Create test election
    await serviceSupabase.from('elections').upsert({
      id: testElectionId,
      title: 'Test Election',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      type: 'leadership',
      status: 'voting_open'
    })

    // Create test candidate
    await serviceSupabase.from('candidates').upsert({
      id: testCandidateId,
      election_id: testElectionId,
      user_id: testUserId,
      full_name: 'Test Candidate',
      position: 'President'
    })

    // Create test initiative
    await serviceSupabase.from('initiatives').upsert({
      id: testInitiativeId,
      election_id: testElectionId,
      title: 'Test Initiative',
      description: 'Test initiative description',
      ballot_order: 1
    })
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await serviceSupabase.from('votes').delete().eq('election_id', testElectionId)
    await serviceSupabase.from('vote_confirmations').delete().eq('election_id', testElectionId)
    await serviceSupabase.from('members').delete().eq('user_id', testUserId)
    await serviceSupabase.from('candidates').delete().eq('election_id', testElectionId)
    await serviceSupabase.from('initiatives').delete().eq('election_id', testElectionId)
    await serviceSupabase.from('elections').delete().eq('id', testElectionId)
  }

  function generateMockJWT(userId: string): string {
    // This is a simplified mock JWT for testing
    // In real tests, you'd use a proper JWT library
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
    const payload = Buffer.from(JSON.stringify({ 
      sub: userId, 
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600 
    })).toString('base64')
    const signature = 'mock-signature'
    
    return `${header}.${payload}.${signature}`
  }
})
