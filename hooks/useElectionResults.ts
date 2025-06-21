'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface CandidateResult {
  id: string;
  fullName: string;
  position: string;
  voteCount: number;
  percentage: number;
  photoUrl?: string;
  bio?: string;
}

interface InitiativeResult {
  id: string;
  title: string;
  description?: string;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  totalVotes: number;
  percentages: {
    yes: number;
    no: number;
    abstain: number;
  };
}

export interface ElectionResults {
  election: {
    id: string;
    title: string;
    description?: string;
    status: string;
    startDate: string;
    endDate: string;
    type: string;
  };
  statistics: {
    totalVoters: number;
    candidateVotes: number;
    initiativeVotes: number;
    turnoutPercentage: number;
    lastUpdated: string;
  };
  candidateResults: CandidateResult[];
  initiativeResults: InitiativeResult[];
  positions: string[];
}

export function useElectionResults(electionId: string) {
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/elections/${electionId}/results`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      
      const data = await response.json();
      setResults(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [electionId]);

  // Set up realtime subscription for vote updates
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`election-results-${electionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `election_id=eq.${electionId}`
        },
        (payload) => {
          console.log('Vote update received:', payload);
          fetchResults();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vote_sessions',
          filter: `election_id=eq.${electionId}`
        },
        (payload) => {
          console.log('Vote session update received:', payload);
          fetchResults();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vote_confirmations',
          filter: `election_id=eq.${electionId}`
        },
        (payload) => {
          console.log('Vote confirmation update received:', payload);
          fetchResults();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [electionId]);

  return {
    results,
    loading,
    error,
    lastUpdated,
    refetch: fetchResults
  };
}
