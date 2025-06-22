import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface CandidateResult {
  id: string;
  full_name: string;
  position: string;
  vote_count: number;
  percentage: number;
  is_winner: boolean;
  ranking: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get all candidates for this election
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id, full_name, position')
      .eq('election_id', id);

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get vote counts for each candidate
    const { data: voteCounts, error: voteError } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('election_id', id)
      .not('candidate_id', 'is', null);

    if (voteError) {
      console.error('Error fetching votes:', voteError);
      return NextResponse.json(
        { error: 'Failed to fetch vote counts' },
        { status: 500 }
      );
    }

    // Count votes per candidate
    const voteCountByCandidate = (voteCounts || []).reduce(
      (acc, vote) => {
        if (vote.candidate_id) {
          acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Group candidates by position and calculate results
    const candidatesByPosition = candidates.reduce(
      (acc, candidate) => {
        if (!acc[candidate.position]) {
          acc[candidate.position] = [];
        }
        acc[candidate.position].push(candidate);
        return acc;
      },
      {} as Record<string, typeof candidates>
    );

    const results: CandidateResult[] = [];

    // Calculate results for each position
    Object.entries(candidatesByPosition).forEach(
      ([position, positionCandidates]) => {
        // Get vote counts for candidates in this position
        const candidateVotes = positionCandidates.map((candidate) => ({
          ...candidate,
          vote_count: voteCountByCandidate[candidate.id] || 0
        }));

        // Calculate total votes for this position
        const totalVotes = candidateVotes.reduce(
          (sum, candidate) => sum + candidate.vote_count,
          0
        );

        // Find the maximum vote count for this position (for determining winners)
        const maxVotes = Math.max(...candidateVotes.map((c) => c.vote_count));

        // Sort by vote count descending to determine ranking
        candidateVotes.sort((a, b) => b.vote_count - a.vote_count);

        // Create results for each candidate in this position
        candidateVotes.forEach((candidate, index) => {
          const percentage =
            totalVotes > 0
              ? Math.round((candidate.vote_count / totalVotes) * 100)
              : 0;
          const isWinner =
            candidate.vote_count > 0 && candidate.vote_count === maxVotes;
          const ranking = index + 1;

          results.push({
            id: candidate.id,
            full_name: candidate.full_name,
            position: candidate.position,
            vote_count: candidate.vote_count,
            percentage,
            is_winner: isWinner,
            ranking
          });
        });
      }
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in candidate results API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
