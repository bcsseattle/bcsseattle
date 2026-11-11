/**
 * Server-side election configuration utilities
 * These functions require database access and should only be used in server components
 */

import dayjs from '@/libs/dayjs';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { ElectionType } from '@/types';
import { 
  ELECTION_TYPE_CONFIGS, 
  getElectionTypeDefaults, 
  ElectionVotingConfig 
} from './election-types';

/**
 * Get election voting configuration from database with type-aware defaults
 */
export async function getElectionVotingConfig(electionId: string): Promise<ElectionVotingConfig & { election_type?: ElectionType }> {
  const supabase = await createClient();
  
  try {
    const { data: election, error } = await supabase
      .from('elections')
      .select('candidate_voting_start, candidate_voting_end, enable_separate_voting_periods, show_unopposed_status, type')
      .eq('id', electionId)
      .single();

    if (error || !election) {
      console.error('Failed to fetch election voting config:', error);
      // Return safe defaults
      return {
        candidate_voting_start: null,
        candidate_voting_end: null,
        enable_separate_voting_periods: false,
        show_unopposed_status: true
      };
    }

    const electionType = election.type as ElectionType;
    const typeConfig = electionType ? ELECTION_TYPE_CONFIGS[electionType] : null;

    return {
      candidate_voting_start: election.candidate_voting_start,
      candidate_voting_end: election.candidate_voting_end,
      enable_separate_voting_periods: election.enable_separate_voting_periods ?? typeConfig?.defaultSeparateVotingPeriods ?? false,
      show_unopposed_status: election.show_unopposed_status ?? typeConfig?.defaultShowUnopposedStatus ?? true,
      election_type: electionType
    };
  } catch (error) {
    console.error('Database query failed:', error);
    // Return safe defaults if query fails
    return {
      candidate_voting_start: null,
      candidate_voting_end: null,
      enable_separate_voting_periods: false,
      show_unopposed_status: true
    };
  }
}

/**
 * Check if candidate voting is currently open for a specific election
 */
export async function isCandidateVotingOpen(electionId: string, nowUtc: dayjs.Dayjs = dayjs.utc()): Promise<boolean> {
  const config = await getElectionVotingConfig(electionId);
  const supabase = await createClient();
  const { data: election } = await supabase
    .from('elections')
    .select('start_date, end_date')
    .eq('id', electionId)
    .maybeSingle();
  if (!election) return false;

  // Candidate voting runs over the election's dates, or over
  // candidate_voting_start/end when separate periods are on (BUG-015, BUG-060:
  // the start used to be ignored).
  const separate = config.enable_separate_voting_periods;
  const start = separate && config.candidate_voting_start ? config.candidate_voting_start : election.start_date;
  const end = separate && config.candidate_voting_end ? config.candidate_voting_end : election.end_date;
  return !nowUtc.isBefore(dayjs.utc(start)) && !nowUtc.isAfter(dayjs.utc(end));
}

/**
 * Get candidate voting period dates for display
 */
export async function getCandidateVotingPeriod(electionId: string): Promise<{
  start: string | null;
  end: string | null;
}> {
  const config = await getElectionVotingConfig(electionId);
  
  return {
    start: config.candidate_voting_start ?? null,
    end: config.candidate_voting_end ?? null
  };
}

/**
 * Get candidate vote results for a specific election
 */
export async function getCandidateResults(electionId: string): Promise<Record<string, { candidateId: string; voteCount: number; position: string; candidateName: string }[]>> {
  // Users can read only their own votes, so tallies need the service role (BUG-019);
  // and never while candidate voting is still open.
  if (await isCandidateVotingOpen(electionId)) return {};
  const supabase = supabaseAdmin;

  try {
    // Get candidate vote counts grouped by position
    const { data: voteResults, error } = await supabase
      .from('votes')
      .select(`
        candidate_id,
        candidates!inner(id, position, full_name)
      `)
      .eq('election_id', electionId)
      .not('candidate_id', 'is', null);
    
    if (error) {
      console.error('Error fetching candidate results:', error);
      return {};
    }
    
    // Count votes per candidate and group by position
    const candidateVotes: Record<string, number> = {};
    const candidateInfo: Record<string, { position: string; name: string }> = {};
    
    voteResults.forEach(vote => {
      if (vote.candidate_id && vote.candidates) {
        const candidateId = vote.candidate_id;
        candidateVotes[candidateId] = (candidateVotes[candidateId] || 0) + 1;
        candidateInfo[candidateId] = {
          position: vote.candidates.position,
          name: vote.candidates.full_name
        };
      }
    });
    
    // Group results by position
    const resultsByPosition: Record<string, { candidateId: string; voteCount: number; position: string; candidateName: string }[]> = {};
    
    Object.entries(candidateVotes).forEach(([candidateId, voteCount]) => {
      const info = candidateInfo[candidateId];
      if (info) {
        if (!resultsByPosition[info.position]) {
          resultsByPosition[info.position] = [];
        }
        resultsByPosition[info.position].push({
          candidateId,
          voteCount,
          position: info.position,
          candidateName: info.name
        });
      }
    });
    
    // Sort candidates by vote count within each position (highest first)
    Object.keys(resultsByPosition).forEach(position => {
      resultsByPosition[position].sort((a, b) => b.voteCount - a.voteCount);
    });
    
    return resultsByPosition;
    
  } catch (error) {
    console.error('Database query failed in getCandidateResults:', error);
    return {};
  }
}

/**
 * Determine if a candidate is elected based on vote results
 */
export async function getCandidateElectionStatus(electionId: string, candidateId: string): Promise<{
  isElected: boolean;
  voteCount: number;
  rank: number;
  totalVotes: number;
}> {
  const results = await getCandidateResults(electionId);
  
  // Find the candidate's position and results
  for (const positionResults of Object.values(results)) {
    const candidateResult = positionResults.find(r => r.candidateId === candidateId);
    if (candidateResult) {
      const rank = positionResults.findIndex(r => r.candidateId === candidateId) + 1;
      const totalVotes = positionResults.reduce((sum, r) => sum + r.voteCount, 0);
      
      return {
        isElected: rank === 1 && candidateResult.voteCount > 0, // Winner with at least 1 vote
        voteCount: candidateResult.voteCount,
        rank,
        totalVotes
      };
    }
  }
  
  return {
    isElected: false,
    voteCount: 0,
    rank: 0,
    totalVotes: 0
  };
}

/**
 * Whether the signed-in user may vote: an approved, active member
 * (bylaws Art. III §3). Checked by the ballot pages and the vote handlers (BUG-007).
 */
export async function currentUserIsActiveMember(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: member } = await supabase
    .from('members')
    .select('isApproved, status')
    .eq('user_id', user.id)
    .maybeSingle();
  return !!member?.isApproved && member.status === 'active';
}
