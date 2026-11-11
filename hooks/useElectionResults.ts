'use client';

import { useEffect, useState } from 'react';

interface CandidateResult {
  id: string;
  fullName: string;
  position: string;
  voteCount: number;
  percentage: number;
  photoUrl?: string;
  bio?: string;
  /** From the certified results, once there are any. */
  outcome?: string;
  note?: string | null;
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
  outcome?: string;
  note?: string | null;
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
    candidateVotingStart?: string | null;
    candidateVotingEnd?: string | null;
    enableSeparateVotingPeriods?: boolean;
    showUnopposedStatus?: boolean;
  };
  votingStatus: {
    candidateVotingOpen: boolean;
    initiativeVotingOpen: boolean;
    candidatesElectedUnopposed: boolean;
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

  // Refresh while the page is open. Realtime can't do this: it applies RLS, and
  // voters may only read their own votes, so other people's never arrived
  // (BUG-045). The results API counts every vote with the service role.
  // ponytail: 15s polling per open results page; push from the server if traffic grows.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchResults();
    }, 15_000);
    return () => clearInterval(timer);
  }, [electionId]);

  return {
    results,
    loading,
    error,
    lastUpdated,
    refetch: fetchResults
  };
}
