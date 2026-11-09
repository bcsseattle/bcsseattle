import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowLeft, Vote } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}

export default async function CandidateVoteConfirmationPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { id } = params;
  const { code } = searchParams;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
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

  // Get vote session details
  const { data: session, error: sessionError } = await supabase
    .from('vote_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('election_id', id)
    .eq('session_type', 'candidates')
    .eq('confirmation_code', code || '')
    .single();

  if (!session || sessionError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Confirmation Not Found</CardTitle>
            <CardDescription className="text-red-700">
              The confirmation code provided is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/elections/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Election
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get user's candidate votes
  const { data: votes } = await supabase
    .from('votes')
    .select(`
      id,
      candidate_id,
      voted_at,
      candidates(full_name, position)
    `)
    .eq('user_id', user.id)
    .eq('election_id', id)
    .eq('vote_type', 'candidates')
    .order('candidates(position)');

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-6 h-6" />
            Candidate Votes Confirmed
          </CardTitle>
          <CardDescription className="text-green-700">
            Your candidate votes for {election.title} have been successfully recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confirmation Details */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-3">Confirmation Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmation Code:</span>
                <span className="font-mono font-medium">{session.confirmation_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Votes Cast:</span>
                <span>{session.votes_cast}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Submitted:</span>
                <span>{new Date(session.completed_at!).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Vote Summary */}
          {votes && votes.length > 0 && (
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Your Candidate Selections
              </h3>
              <div className="space-y-2">
                {votes.map((vote) => (
                  <div key={vote.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium">
                      {vote.candidates?.position}
                    </span>
                    <Badge variant="secondary">
                      {vote.candidates?.full_name}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link href={`/elections/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Election
              </Button>
            </Link>
            
            {/* Check if initiatives are available for voting */}
            <Link href={`/elections/${id}/vote/initiatives`}>
              <Button variant="default">
                Vote on Initiatives
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
