import { createClient } from '@/utils/supabase/server';
import { ballotRefusal } from '@/utils/elections/access';
import { notFound, redirect } from 'next/navigation';
import InitiativeVotingClient from '@/components/elections/initiative-voting-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InitiativeVotePage(props: Props) {
  const params = await props.params;
  const { id } = params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?next=' + encodeURIComponent(`/elections/${id}/vote/initiatives`));
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
  if (await ballotRefusal(supabase, id, user.id, 'initiatives')) {
    redirect(`/elections/${id}`);
  }

  // Check if user has already voted for initiatives
  const { data: existingSession } = await supabase
    .from('vote_sessions')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('election_id', id)
    .eq('session_type', 'initiatives')
    .single();

  const hasVoted = !!existingSession?.completed_at;

  // Get initiatives for this election
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('*')
    .eq('election_id', id)
    .order('ballot_order');

  return (
    <div className="w-full">
      <InitiativeVotingClient
        election={election}
        initiatives={initiatives || []}
        hasVoted={hasVoted}
        userId={user.id}
      />
    </div>
  );
}
