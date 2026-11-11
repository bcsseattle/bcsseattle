import { createClient } from '@/utils/supabase/server';
import { ballotRefusal } from '@/utils/elections/access';
import { notFound, redirect } from 'next/navigation';
import CandidateVotingClient from '@/components/elections/candidate-voting-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CandidateVotePage(props: Props) {
  const params = await props.params;
  const { id } = params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?next=' + encodeURIComponent(`/elections/${id}/vote/candidates`));
  }

  // Get election details
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  if (!election || electionError) {
    notFound();
  }

  // Locked ballot, window open, approved active member on the roll: the same
  // check the vote handlers make (BUG-007, BUG-060).
  if (await ballotRefusal(supabase, id, user.id, 'candidates')) {
    redirect(`/elections/${id}`);
  }

  // Check if user has already voted for candidates
  const { data: existingSession } = await supabase
    .from('vote_sessions')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('election_id', id)
    .eq('session_type', 'candidates')
    .single();

  const hasVoted = !!existingSession?.completed_at;

  // Get candidates for this election
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('election_id', id)
    .order('position');

  // Get position order for the election type
  async function getPositionOrder() {
    // Try to fetch from database first
    const { data: dbPositions } = await supabase
      .from('election_positions')
      .select('position, description, display_order')
      .eq('election_type', election!.type || 'leadership')
      .order('display_order');

    if (dbPositions?.length) {
      return dbPositions;
    }

    // Fallback to hardcoded positions based on election type
    const defaultPositions = {
      leadership: [
        {
          position: 'President',
          description: 'Chief executive officer who leads the organization and represents it publicly',
          display_order: 1
        },
        {
          position: 'Vice President',
          description: 'Second in command who assists the president and steps in when needed',
          display_order: 2
        },
        {
          position: 'Secretary',
          description: 'Records meeting minutes, manages correspondence, and maintains official documents',
          display_order: 3
        },
        {
          position: 'Treasurer',
          description: 'Manages organizational finances, budget, and financial reporting',
          display_order: 4
        }
      ],
      board: [
        {
          position: 'Chairperson',
          description: 'Leads board meetings and oversees board activities',
          display_order: 1
        },
        {
          position: 'Board Member',
          description: 'Participates in board decisions and organizational governance',
          display_order: 2
        }
      ]
    };

    const typePositions = defaultPositions[(election!.type || 'leadership') as keyof typeof defaultPositions];
    if (typePositions) {
      return typePositions;
    }

    // Final fallback: extract unique positions from candidates
    return Array.from(new Set(candidates?.map((c) => c.position) || [])).map(
      (position, index) => ({
        position,
        description: '',
        display_order: index + 1
      })
    );
  }

  const positionOrder = await getPositionOrder();

  return (
    <div className="w-full">
      <CandidateVotingClient
        election={election}
        candidates={candidates || []}
        positionOrder={positionOrder}
        hasVoted={hasVoted}
        userId={user.id}
      />
    </div>
  );
}
