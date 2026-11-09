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
import {
  CheckCircle,
  ArrowLeft,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}

export default async function InitiativeVoteConfirmationPage(props: Props) {
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
    .eq('session_type', 'initiatives')
    .eq('confirmation_code', code || '')
    .single();

  if (!session || sessionError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Confirmation Not Found
            </CardTitle>
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

  // Get user's initiative votes
  const { data: votes } = await supabase
    .from('votes')
    .select(
      `
      id,
      initiative_id,
      vote_value,
      voted_at,
      initiatives(title, ballot_order)
    `
    )
    .eq('user_id', user.id)
    .eq('election_id', id)
    .eq('vote_type', 'initiatives')
    .order('initiatives(ballot_order)');

  // Helper function to get vote icon
  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case 'yes':
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'no':
        return <ThumbsDown className="w-4 h-4 text-red-600" />;
      case 'abstain':
        return <Minus className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  // Helper function to get vote badge variant
  const getVoteBadgeVariant = (vote: string) => {
    switch (vote) {
      case 'yes':
        return 'default';
      case 'no':
        return 'destructive';
      case 'abstain':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <CheckCircle className="w-6 h-6" />
            Initiative Votes Confirmed
          </CardTitle>
          <CardDescription className="text-blue-700">
            Your initiative votes for {election.title} have been successfully
            recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confirmation Details */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-3">Confirmation Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmation Code:</span>
                <span className="font-mono font-medium">
                  {session.confirmation_code}
                </span>
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
                <FileText className="w-4 h-4" />
                Your Initiative Votes
              </h3>
              <div className="space-y-3">
                {votes.map((vote) => (
                  <div
                    key={vote.id}
                    className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-medium">
                      {vote.initiatives?.title}
                    </span>
                    <Badge
                      variant={getVoteBadgeVariant(
                        vote.vote_value ?? 'abstain'
                      )}
                      className="flex items-center gap-1"
                    >
                      {getVoteIcon(vote.vote_value ?? 'abstain')}
                      {vote.vote_value === 'yes'
                        ? 'Yes'
                        : vote.vote_value === 'no'
                          ? 'No'
                          : 'Abstain'}
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

            {/* Check if candidates are available for voting */}
            <Link href={`/elections/${id}/vote/candidates`}>
              <Button variant="default">Vote for Candidates</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
