/**
 * API Tests for Voting Endpoints
 * Tests the POST and GET /api/elections/[id]/vote endpoints
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '../../app/api/elections/[id]/vote/route'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types_db'

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((key: string) => {
      const mockHeaders: Record<string, string> = {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Mozilla/5.0 (Test Browser)'
      }
      return mockHeaders[key] || null
    })
  }))
}))

// Mock Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn()
}))

describe('Voting API Endpoints', () => {
  let mockSupabase: any
  const testElectionId = 'test-election-id'
  const testUserId = 'test-user-id'
  const testCandidateId = 'test-candidate-id'
  const testInitiativeId = 'test-initiative-id'

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(),
      rpc: jest.fn()
    }

    const mockCreateClient = require('@/utils/supabase/server').createClient as jest.Mock
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('POST /api/elections/[id]/vote', () => {
    const createRequest = (body: any, params = { id: testElectionId }) => {
      return new NextRequest('http://localhost:3000/api/elections/test/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })
    }

    const createContext = (params: any) => ({ params })

    it('should successfully submit votes', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock election validation
      const mockElectionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testElectionId,
            title: 'Test Election',
            start_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            end_date: new Date(Date.now() + 3600000).toISOString(),   // 1 hour from now
            status: 'voting_open'
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockElectionQuery)

      // Mock existing vote check
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null })

      // Mock membership check
      const mockMemberQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: 'active' },
          error: null
        })
      }

      // Mock candidate validation
      const mockCandidateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: testCandidateId, position: 'President' }],
          error: null
        })
      }

      // Mock initiative validation
      const mockInitiativeQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: testInitiativeId, title: 'Test Initiative' }],
          error: null
        })
      }

      // Mock vote insertion
      const mockVoteInsert = {
        insert: jest.fn().mockResolvedValue({
          data: [
            { id: 'vote-1', user_id: testUserId, candidate_id: testCandidateId },
            { id: 'vote-2', user_id: testUserId, initiative_id: testInitiativeId }
          ],
          error: null
        })
      }

      // Mock confirmation insertion
      const mockConfirmationInsert = {
        insert: jest.fn().mockResolvedValue({
          data: [{ confirmation_code: 'ABC123DEF456' }],
          error: null
        })
      }

      // Setup mock responses based on table name
      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'elections': return mockElectionQuery
          case 'members': return mockMemberQuery
          case 'candidates': return mockCandidateQuery
          case 'initiatives': return mockInitiativeQuery
          case 'votes': return mockVoteInsert
          case 'vote_confirmations': return mockConfirmationInsert
          default: return mockElectionQuery
        }
      })

      const requestBody = {
        candidateVotes: [{ candidateId: testCandidateId, position: 'President' }],
        initiativeVotes: [{ initiativeId: testInitiativeId, vote: true }]
      }

      const request = createRequest(requestBody)
      const context = createContext({ id: testElectionId })

      const response = await POST(request, context)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.confirmationCode).toBeTruthy()
      expect(result.votesCast).toBe(2)
    })

    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = createRequest({})
      const context = createContext({ id: testElectionId })

      const response = await POST(request, context)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('authenticated')
    })

    it('should reject votes outside voting window', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock election with closed voting window
      const mockElectionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testElectionId,
            start_date: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            end_date: new Date(Date.now() - 3600000).toISOString(),   // 1 hour ago (closed)
            status: 'voting_closed'
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockElectionQuery)

      const request = createRequest({ candidateVotes: [], initiativeVotes: [] })
      const context = createContext({ id: testElectionId })

      const response = await POST(request, context)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('voting window')
    })

    it('should reject duplicate votes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock election validation
      const mockElectionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testElectionId,
            start_date: new Date(Date.now() - 3600000).toISOString(),
            end_date: new Date(Date.now() + 3600000).toISOString(),
            status: 'voting_open'
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockElectionQuery)

      // Mock existing vote check - user has already voted
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

      const request = createRequest({ candidateVotes: [], initiativeVotes: [] })
      const context = createContext({ id: testElectionId })

      const response = await POST(request, context)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('already voted')
    })

    it('should enforce membership requirement', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock election validation
      const mockElectionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testElectionId,
            start_date: new Date(Date.now() - 3600000).toISOString(),
            end_date: new Date(Date.now() + 3600000).toISOString(),
            status: 'voting_open'
          },
          error: null
        })
      }

      // Mock inactive membership
      const mockMemberQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: 'inactive' },
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'elections': return mockElectionQuery
          case 'members': return mockMemberQuery
          default: return mockElectionQuery
        }
      })

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null })

      const request = createRequest({ candidateVotes: [], initiativeVotes: [] })
      const context = createContext({ id: testElectionId })

      const response = await POST(request, context)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('active membership')
    })

    it('should validate candidate IDs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock setup similar to successful case but with invalid candidate
      const mockElectionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testElectionId,
            start_date: new Date(Date.now() - 3600000).toISOString(),
            end_date: new Date(Date.now() + 3600000).toISOString(),
            status: 'voting_open'
          },
          error: null
        })
      }

      const mockMemberQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: 'active' },
          error: null
        })
      }

      // Mock empty candidate validation (candidate doesn't exist)
      const mockCandidateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [], // No candidates found
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'elections': return mockElectionQuery
          case 'members': return mockMemberQuery
          case 'candidates': return mockCandidateQuery
          default: return mockElectionQuery
        }
      })

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null })

      const requestBody = {
        candidateVotes: [{ candidateId: 'invalid-candidate-id', position: 'President' }],
        initiativeVotes: []
      }

      const request = createRequest(requestBody)
      const context = createContext({ id: testElectionId })

      const response = await POST(request, context)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Invalid candidate')
    })
  })

  describe('GET /api/elections/[id]/vote', () => {
    const createContext = (params: any) => ({ params })

    it('should return voting status for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock votes query
      const mockVotesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'vote-1',
                candidate_id: testCandidateId,
                initiative_id: null,
                vote_value: null,
                voted_at: new Date().toISOString(),
                candidates: { full_name: 'Test Candidate', position: 'President' },
                initiatives: null
              }
            ],
            error: null
          })
        })
      }

      // Mock confirmation query
      const mockConfirmationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              confirmation_code: 'ABC123DEF456',
              votes_cast: 1,
              confirmed_at: new Date().toISOString()
            },
            error: null
          })
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'votes': return mockVotesQuery
          case 'vote_confirmations': return mockConfirmationQuery
          default: return mockVotesQuery
        }
      })

      const context = createContext({ id: testElectionId })
      const response = await GET(new NextRequest('http://localhost:3000'), context)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.hasVoted).toBe(true)
      expect(result.votes).toHaveLength(1)
      expect(result.confirmation).toBeTruthy()
      expect(result.confirmation.confirmation_code).toBe('ABC123DEF456')
    })

    it('should return false for user who has not voted', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
        error: null
      })

      // Mock empty votes query
      const mockVotesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      }

      const mockConfirmationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // Not found
          })
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'votes': return mockVotesQuery
          case 'vote_confirmations': return mockConfirmationQuery
          default: return mockVotesQuery
        }
      })

      const context = createContext({ id: testElectionId })
      const response = await GET(new NextRequest('http://localhost:3000'), context)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.hasVoted).toBe(false)
      expect(result.votes).toHaveLength(0)
      expect(result.confirmation).toBeUndefined()
    })

    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const context = createContext({ id: testElectionId })
      const response = await GET(new NextRequest('http://localhost:3000'), context)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('authenticated')
    })
  })
})
