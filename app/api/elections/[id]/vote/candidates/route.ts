import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  submitCandidateVotes,
  getVotingStatus
} from '@/utils/elections/handlers';

// Type definitions for candidate voting
interface CandidateVote {
  candidateId: string;
  position: string;
}

interface CandidateVoteRequest {
  candidateVotes: CandidateVote[];
}

// POST - Submit candidate votes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

    // Parse request body
    let body: CandidateVoteRequest;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { candidateVotes } = body;

    // Validate request
    if (!candidateVotes || !Array.isArray(candidateVotes)) {
      return NextResponse.json(
        { error: 'candidateVotes array is required' },
        { status: 400 }
      );
    }

    // Get headers for IP tracking
    const headersList = await headers();

    // Use the handler to submit votes
    const result = await submitCandidateVotes(
      candidateVotes,
      electionId,
      headersList
    );

    if (!result.success) {
      const statusCode = result.error?.includes('Authentication')
        ? 401
        : result.error?.includes('not found')
          ? 404
          : 400;

      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      confirmationCode: result.confirmationCode,
      votesCast: result.votesCast,
      sessionId: result.sessionId
    });
  } catch (error) {
    console.error('Error in candidate voting API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's candidate voting status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

    // Use the handler to get voting status
    const result = await getVotingStatus(electionId, 'candidates');

    if (result.error) {
      const statusCode = result.error?.includes('Authentication') ? 401 : 400;

      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    return NextResponse.json({
      hasVoted: result.hasVoted,
      votes: result.votes || [],
      session: result.session || null
    });
  } catch (error) {
    console.error('Error in candidate voting status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
