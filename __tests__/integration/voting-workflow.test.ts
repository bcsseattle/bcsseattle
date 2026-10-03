/**
 * Integration Tests for Voting Feature
 * Tests complete voting workflows and edge cases
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types_db'

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'your-service-key'

describe('Voting Feature Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  
  // Test data
  const testElectionId = 'integration-test-election'
  const testUserId = 'integration-test-user'
  const testUser2Id = 'integration-test-user-2'
  const testCandidateId = 'integration-test-candidate'
  const testInitiativeId = 'integration-test-initiative'

  beforeAll(async () => {
    supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY)
    await setupTestEnvironment()
  })

  afterAll(async () => {
    await cleanupTestEnvironment()
  })

  describe('Complete Voting Workflow', () => {
    beforeEach(async () => {
      // Clean previous test data
      await supabase.from('votes').delete().eq('election_id', testElectionId)
      await supabase.from('vote_confirmations').delete().eq('election_id', testElectionId)
    })

    it('should complete a full voting cycle', async () => {
      // Step 1: Verify election is ready for voting
      const { data: election } = await supabase
        .from('elections')
        .select('*')
        .eq('id', testElectionId)
        .single()

      expect(election).toBeTruthy()
      expect(election.status).toBe('voting_open')
      expect(new Date(election.start_date).getTime()).toBeLessThanOrEqual(Date.now())
      expect(new Date(election.end_date).getTime()).toBeGreaterThan(Date.now())

      // Step 2: Verify candidates and initiatives exist
      const { data: candidates } = await supabase
        .from('candidates')
        .select('*')
        .eq('election_id', testElectionId)

      const { data: initiatives } = await supabase
        .from('initiatives')
        .select('*')
        .eq('election_id', testElectionId)

      expect(candidates).toHaveLength(1)
      expect(initiatives).toHaveLength(1)

      // Step 3: Verify user has not voted yet
      const { data: hasVoted } = await supabase.rpc('user_has_voted_in_election', {
        election_uuid: testElectionId,
        user_uuid: testUserId
      })
      expect(hasVoted).toBe(false)

      // Step 4: Submit votes
      const votes = [
        {
          election_id: testElectionId,
          user_id: testUserId,
          candidate_id: testCandidateId,
          vote_value: null,
          voted_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
          user_agent: 'Jest Test Agent'
        },
        {
          election_id: testElectionId,
          user_id: testUserId,
          initiative_id: testInitiativeId,
          vote_value: 'yes',
          voted_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
          user_agent: 'Jest Test Agent'
        }
      ]

      const { data: insertedVotes, error: voteError } = await supabase
        .from('votes')
        .insert(votes)
        .select()

      expect(voteError).toBeNull()
      expect(insertedVotes).toHaveLength(2)

      // Step 5: Create vote confirmation
      const confirmationCode = generateTestConfirmationCode()
      const { data: confirmation, error: confirmationError } = await supabase
        .from('vote_confirmations')
        .insert({
          user_id: testUserId,
          election_id: testElectionId,
          confirmation_code: confirmationCode,
          votes_cast: 2
        })
        .select()
        .single()

      expect(confirmationError).toBeNull()
      expect(confirmation.confirmation_code).toBe(confirmationCode)

      // Step 6: Verify user has voted
      const { data: hasVotedAfter } = await supabase.rpc('user_has_voted_in_election', {
        election_uuid: testElectionId,
        user_uuid: testUserId
      })
      expect(hasVotedAfter).toBe(true)

      // Step 7: Verify vote counts
      const { data: voteCounts } = await supabase.rpc('get_election_vote_count', {
        election_uuid: testElectionId
      })

      expect(voteCounts).toHaveLength(1)
      expect(voteCounts[0]).toEqual({
        candidate_votes: 1,
        initiative_votes: 1,
        total_voters: 1
      })
    })

    it('should prevent duplicate voting', async () => {
      // First vote
      await supabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null
      })

      // Attempt duplicate vote
      const { error } = await supabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null
      })

      expect(error).toBeTruthy()
      expect(error.message).toContain('unique')
    })

    it('should handle multiple users voting', async () => {
      // User 1 votes
      await supabase.from('votes').insert([
        {
          election_id: testElectionId,
          user_id: testUserId,
          candidate_id: testCandidateId,
          vote_value: null
        },
        {
          election_id: testElectionId,
          user_id: testUserId,
          initiative_id: testInitiativeId,
          vote_value: 'yes'
        }
      ])

      // User 2 votes
      await supabase.from('votes').insert([
        {
          election_id: testElectionId,
          user_id: testUser2Id,
          candidate_id: testCandidateId,
          vote_value: null
        },
        {
          election_id: testElectionId,
          user_id: testUser2Id,
          initiative_id: testInitiativeId,
          vote_value: 'no'
        }
      ])

      // Verify vote counts
      const { data: voteCounts } = await supabase.rpc('get_election_vote_count', {
        election_uuid: testElectionId
      })

      expect(voteCounts[0]).toEqual({
        candidate_votes: 2,
        initiative_votes: 2,
        total_voters: 2
      })

      // Verify individual votes
      const { data: user1Votes } = await supabase
        .from('votes')
        .select('*')
        .eq('election_id', testElectionId)
        .eq('user_id', testUserId)

      const { data: user2Votes } = await supabase
        .from('votes')
        .select('*')
        .eq('election_id', testElectionId)
        .eq('user_id', testUser2Id)

      expect(user1Votes).toHaveLength(2)
      expect(user2Votes).toHaveLength(2)
    })
  })

  describe('Vote Validation Rules', () => {
    it('should enforce vote type constraints', async () => {
      // Test: Cannot vote for both candidate and initiative in same record
      const { error } = await supabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        initiative_id: testInitiativeId,
        vote_value: 'yes'
      })

      expect(error).toBeTruthy()
      expect(error.message).toContain('vote_type_check')
    })

    it('should enforce foreign key constraints', async () => {
      // Test: Cannot vote for non-existent candidate
      const { error: candidateError } = await supabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: 'non-existent-candidate',
        vote_value: null
      })

      expect(candidateError).toBeTruthy()
      expect(candidateError.message).toContain('foreign key')

      // Test: Cannot vote for non-existent initiative
      const { error: initiativeError } = await supabase.from('votes').insert({
        election_id: testElectionId,
        user_id: testUserId,
        initiative_id: 'non-existent-initiative',
        vote_value: 'yes'
      })

      expect(initiativeError).toBeTruthy()
      expect(initiativeError.message).toContain('foreign key')
    })

    it('should validate vote values for initiatives', async () => {
      // Valid vote values
      const validVotes = ['yes', 'no', 'abstain']
      
      for (const voteValue of validVotes) {
        const { error } = await supabase.from('votes').insert({
          election_id: testElectionId,
          user_id: `${testUserId}-${voteValue}`,
          initiative_id: testInitiativeId,
          vote_value: voteValue
        })

        expect(error).toBeNull()
      }

      // Clean up
      await supabase.from('votes').delete().like('user_id', `${testUserId}-%`)
    })
  })

  describe('Audit Trail and Security', () => {
    it('should record complete audit information', async () => {
      const auditData = {
        election_id: testElectionId,
        user_id: testUserId,
        candidate_id: testCandidateId,
        vote_value: null,
        voted_at: new Date().toISOString(),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Test Browser)'
      }

      const { data: vote, error } = await supabase
        .from('votes')
        .insert(auditData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(vote.ip_address).toBe('192.168.1.100')
      expect(vote.user_agent).toBe('Mozilla/5.0 (Test Browser)')
      expect(vote.voted_at).toBeTruthy()
    })

    it('should generate unique confirmation codes', async () => {
      const confirmations = []
      
      // Generate multiple confirmations
      for (let i = 0; i < 10; i++) {
        const code = generateTestConfirmationCode()
        confirmations.push(code)
        
        await supabase.from('vote_confirmations').insert({
          user_id: `${testUserId}-${i}`,
          election_id: testElectionId,
          confirmation_code: code,
          votes_cast: 1
        })
      }
      
      // Verify all codes are unique
      const uniqueCodes = new Set(confirmations)
      expect(uniqueCodes.size).toBe(confirmations.length)
      
      // Clean up
      await supabase.from('vote_confirmations').delete().like('user_id', `${testUserId}-%`)
    })

    it('should enforce confirmation code uniqueness', async () => {
      const duplicateCode = 'DUPLICATE123'
      
      // Insert first confirmation
      const { error: firstError } = await supabase
        .from('vote_confirmations')
        .insert({
          user_id: testUserId,
          election_id: testElectionId,
          confirmation_code: duplicateCode,
          votes_cast: 1
        })
      
      expect(firstError).toBeNull()
      
      // Try to insert duplicate code
      const { error: duplicateError } = await supabase
        .from('vote_confirmations')
        .insert({
          user_id: testUser2Id,
          election_id: testElectionId,
          confirmation_code: duplicateCode,
          votes_cast: 1
        })
      
      expect(duplicateError).toBeTruthy()
      expect(duplicateError.message).toContain('unique')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle bulk vote insertion efficiently', async () => {
      const startTime = Date.now()
      const bulkVotes = []
      
      // Create 100 votes for performance testing
      for (let i = 0; i < 100; i++) {
        bulkVotes.push({
          election_id: testElectionId,
          user_id: `bulk-user-${i}`,
          candidate_id: testCandidateId,
          vote_value: null,
          voted_at: new Date().toISOString()
        })
      }
      
      const { data, error } = await supabase
        .from('votes')
        .insert(bulkVotes)
        .select()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(error).toBeNull()
      expect(data).toHaveLength(100)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      
      // Clean up
      await supabase.from('votes').delete().like('user_id', 'bulk-user-%')
    })

    it('should efficiently query vote counts for large datasets', async () => {
      // Insert test data
      const bulkVotes = []
      for (let i = 0; i < 50; i++) {
        bulkVotes.push({
          election_id: testElectionId,
          user_id: `perf-user-${i}`,
          candidate_id: testCandidateId,
          vote_value: null
        })
        bulkVotes.push({
          election_id: testElectionId,
          user_id: `perf-user-${i}`,
          initiative_id: testInitiativeId,
          vote_value: i % 2 === 0 ? 'yes' : 'no'
        })
      }
      
      await supabase.from('votes').insert(bulkVotes)
      
      const startTime = Date.now()
      const { data: voteCounts } = await supabase.rpc('get_election_vote_count', {
        election_uuid: testElectionId
      })
      const endTime = Date.now()
      
      expect(voteCounts[0]).toEqual({
        candidate_votes: 50,
        initiative_votes: 50,
        total_voters: 50
      })
      
      // Query should be fast even with 100 votes
      expect(endTime - startTime).toBeLessThan(1000)
      
      // Clean up
      await supabase.from('votes').delete().like('user_id', 'perf-user-%')
    })
  })

  // Helper functions
  async function setupTestEnvironment() {
    // Create test election
    await supabase.from('elections').upsert({
      id: testElectionId,
      title: 'Integration Test Election',
      description: 'Test election for integration testing',
      type: 'leadership',
      start_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      end_date: new Date(Date.now() + 3600000).toISOString(),   // 1 hour from now
      status: 'voting_open',
      is_active: true
    })

    // Create test candidate
    await supabase.from('candidates').upsert({
      id: testCandidateId,
      election_id: testElectionId,
      user_id: testUserId,
      full_name: 'Integration Test Candidate',
      position: 'President',
      bio: 'Test candidate for integration testing'
    })

    // Create test initiative
    await supabase.from('initiatives').upsert({
      id: testInitiativeId,
      election_id: testElectionId,
      title: 'Integration Test Initiative',
      description: 'Test initiative for integration testing',
      ballot_order: 1
    })

    // Create test members
    await supabase.from('members').upsert([
      {
        user_id: testUserId,
        status: 'active',
        membership_type: 'Individual'
      },
      {
        user_id: testUser2Id,
        status: 'active',
        membership_type: 'Individual'
      }
    ])
  }

  async function cleanupTestEnvironment() {
    // Clean up in reverse order of dependencies
    await supabase.from('votes').delete().eq('election_id', testElectionId)
    await supabase.from('vote_confirmations').delete().eq('election_id', testElectionId)
    await supabase.from('members').delete().in('user_id', [testUserId, testUser2Id])
    await supabase.from('candidates').delete().eq('election_id', testElectionId)
    await supabase.from('initiatives').delete().eq('election_id', testElectionId)
    await supabase.from('elections').delete().eq('id', testElectionId)
  }

  function generateTestConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase()
  }
})
