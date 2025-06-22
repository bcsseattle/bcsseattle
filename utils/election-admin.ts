/**
 * Admin utilities for managing candidate voting periods
 * Enhanced with election type-aware logic and defaults
 */

import { createClient } from '@/utils/supabase/server';
import dayjs from '@/libs/dayjs';
import { getElectionTypeDefaults, getTypicalElectionDuration, ELECTION_TYPE_CONFIGS } from './election-types';
import { ElectionType } from '@/types';

export interface CandidateVotingUpdate {
  candidateVotingEnd?: string | null;
  enableSeparateVotingPeriods?: boolean;
  showUnopposedStatus?: boolean;
}

/**
 * Close candidate voting while keeping initiative voting open
 * Now uses type-aware defaults
 */
export async function closeCandidateVoting(
  electionId: string, 
  cutoffDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // First get the election type to use appropriate defaults
    const { data: election } = await supabase
      .from('elections')
      .select('type')
      .eq('id', electionId)
      .single();

    const electionType = election?.type as ElectionType;
    const typeDefaults = electionType ? getElectionTypeDefaults(electionType) : {};

    const { error } = await supabase
      .from('elections')
      .update({
        candidate_voting_end: cutoffDate || dayjs.utc().toISOString(),
        enable_separate_voting_periods: typeDefaults.enable_separate_voting_periods ?? true,
        show_unopposed_status: typeDefaults.show_unopposed_status ?? true
      })
      .eq('id', electionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Re-open candidate voting
 */
export async function reopenCandidateVoting(
  electionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get the election's general end date
    const { data: election, error: fetchError } = await supabase
      .from('elections')
      .select('end_date')
      .eq('id', electionId)
      .single();

    if (fetchError || !election) {
      return { success: false, error: 'Election not found' };
    }

    const { error } = await supabase
      .from('elections')
      .update({
        candidate_voting_end: election.end_date, // Same as general election end
        enable_separate_voting_periods: false,
        show_unopposed_status: true
      })
      .eq('id', electionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Update candidate voting configuration
 */
export async function updateCandidateVotingConfig(
  electionId: string,
  updates: CandidateVotingUpdate
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    const updateData: any = {};
    
    if (updates.candidateVotingEnd !== undefined) {
      updateData.candidate_voting_end = updates.candidateVotingEnd;
    }
    
    if (updates.enableSeparateVotingPeriods !== undefined) {
      updateData.enable_separate_voting_periods = updates.enableSeparateVotingPeriods;
    }
    
    if (updates.showUnopposedStatus !== undefined) {
      updateData.show_unopposed_status = updates.showUnopposedStatus;
    }

    const { error } = await supabase
      .from('elections')
      .update(updateData)
      .eq('id', electionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Configure election with type-appropriate defaults
 */
export async function configureElectionByType(
  electionId: string, 
  electionType: ElectionType,
  customConfig?: Partial<CandidateVotingUpdate>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    const typeDefaults = getElectionTypeDefaults(electionType);
    const typicalDuration = getTypicalElectionDuration(electionType);
    
    // Get current election details
    const { data: election } = await supabase
      .from('elections')
      .select('start_date, end_date')
      .eq('id', electionId)
      .single();

    if (!election) {
      return { success: false, error: 'Election not found' };
    }

    // Calculate suggested candidate voting end date (earlier than election end)
    const electionEnd = dayjs(election.end_date);
    const suggestedCandidateEnd = electionEnd.subtract(Math.floor(typicalDuration * 0.3), 'days');

    const updateData = {
      ...typeDefaults,
      ...customConfig,
      // Set candidate voting end to be earlier than election end for leadership/board types
      candidate_voting_end: ELECTION_TYPE_CONFIGS[electionType]?.allowsUnopposedCandidates 
        ? suggestedCandidateEnd.toISOString()
        : null
    };

    const { error } = await supabase
      .from('elections')
      .update(updateData)
      .eq('id', electionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Get current voting status for an election
 */
export async function getElectionVotingStatus(electionId: string) {
  const supabase = await createClient();
  
  try {
    const { data: election, error } = await supabase
      .from('elections')
      .select(`
        id,
        title,
        start_date,
        end_date,
        candidate_voting_start,
        candidate_voting_end,
        enable_separate_voting_periods,
        show_unopposed_status
      `)
      .eq('id', electionId)
      .single();

    if (error || !election) {
      return { success: false, error: 'Election not found' };
    }

    const now = dayjs.utc();
    const candidateVotingOpen = election.enable_separate_voting_periods 
      ? (election.candidate_voting_end ? now.isBefore(dayjs.utc(election.candidate_voting_end)) : true)
      : true;
    
    const initiativeVotingOpen = now.isAfter(dayjs.utc(election.start_date)) && 
                                now.isBefore(dayjs.utc(election.end_date));

    return {
      success: true,
      data: {
        election,
        status: {
          candidateVotingOpen,
          initiativeVotingOpen,
          candidatesElectedUnopposed: !candidateVotingOpen && election.show_unopposed_status
        }
      }
    };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}
