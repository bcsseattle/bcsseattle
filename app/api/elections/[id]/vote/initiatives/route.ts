import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { submitInitiativeVotes, getVotingStatus } from '@/utils/elections/handlers';

// Type definitions for initiative voting
interface InitiativeVote {
  initiativeId: string;
  vote: 'yes' | 'no' | 'abstain';
}

interface InitiativeVoteRequest {
  initiativeVotes: InitiativeVote[];
}

// POST - Submit initiative votes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

    // Parse request body
    let body: InitiativeVoteRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { initiativeVotes } = body;

    // Validate request
    if (!initiativeVotes || !Array.isArray(initiativeVotes)) {
      return NextResponse.json(
        { error: 'initiativeVotes array is required' },
        { status: 400 }
      );
    }

    // Get headers for IP tracking
    const headersList = await headers();

    // Use the handler to submit votes
    const result = await submitInitiativeVotes(initiativeVotes, electionId, headersList);

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
    console.error('Error in initiative voting API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's initiative voting status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

    // Use the handler to get voting status
    const result = await getVotingStatus(electionId, 'initiatives');

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
    console.error('Error in initiative voting status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}