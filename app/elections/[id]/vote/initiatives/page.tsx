import { createClient } from '@/utils/supabase/server';
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

  // Check if voting is open
  const now = new Date();
  const start = new Date(election.start_date);
  const end = new Date(election.end_date);
  const isVotingOpen = now >= start && now <= end;

  if (!isVotingOpen) {
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
    <div className="container mx-auto px-4 py-8">
      <InitiativeVotingClient
        election={election}
        initiatives={initiatives || []}
        hasVoted={hasVoted}
        userId={user.id}
      />
    </div>
  );
}
