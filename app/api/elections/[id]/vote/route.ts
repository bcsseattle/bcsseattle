import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { submitCombinedVotes, getVotingStatus } from '@/utils/elections/handlers';

// Type definitions for combined voting
interface CandidateVote {
  candidateId: string;
  position: string;
}

interface InitiativeVote {
  initiativeId: string;
  vote: 'yes' | 'no' | 'abstain';
}

interface CombinedVoteRequest {
  candidateVotes: CandidateVote[];
  initiativeVotes: InitiativeVote[];
}

// POST - Submit combined votes (candidates + initiatives)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

    // Parse request body
    let body: CombinedVoteRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { candidateVotes = [], initiativeVotes = [] } = body;

    // Validate that at least one type of vote is provided
    if (candidateVotes.length === 0 && initiativeVotes.length === 0) {
      return NextResponse.json(
        { error: 'At least one vote (candidate or initiative) is required' },
        { status: 400 }
      );
    }

    // Get headers for IP tracking
    const headersList = await headers();

    // Use the handler to submit combined votes
    const result = await submitCombinedVotes(candidateVotes, initiativeVotes, electionId, headersList);

    if (!result.success) {
      const statusCode = result.error?.includes('Authentication') ? 401 :
                        result.error?.includes('not found') ? 404 : 400;
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      confirmationCode: result.confirmationCode,
      votesCast: result.votesCast,
      sessionId: result.sessionId
    });

  } catch (error) {
    console.error('Error in combined voting API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's overall voting status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

    // Use the handler to get overall voting status
    const result = await getVotingStatus(electionId);

    if (result.error) {
      const statusCode = result.error?.includes('Authentication') ? 401 : 400;
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      hasVoted: result.hasVoted,
      votes: result.votes || [],
      session: result.session || null
    });

  } catch (error) {
    console.error('Error in voting status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}