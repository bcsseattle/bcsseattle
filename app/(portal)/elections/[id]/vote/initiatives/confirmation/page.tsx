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
import { formatDeadline } from '@/utils/format';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';

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
      <div className="max-w-2xl">
        <Card className="border-badge-red-border bg-badge-red-bg">
          <CardHeader>
            <CardTitle className="text-badge-red-text">
              Confirmation Not Found
            </CardTitle>
            <CardDescription className="text-badge-red-text">
              The confirmation code provided is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild><Link href={`/elections/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Election
              </Link></Button>
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
        return <ThumbsUp className="w-4 h-4 text-badge-green-text" />;
      case 'no':
        return <ThumbsDown className="w-4 h-4 text-badge-red-text" />;
      case 'abstain':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
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
    <div className="max-w-2xl">
      <BreadcrumbName id={id} name={election.title} />
      <Card className="border-accent-200 bg-accent-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle className="w-6 h-6" />
            Initiative Votes Confirmed
          </CardTitle>
          <CardDescription className="text-foreground">
            Your initiative votes for {election.title} have been successfully
            recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confirmation Details */}
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-semibold mb-3">Confirmation Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmation Code:</span>
                <span className="font-mono font-medium">
                  {session.confirmation_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Votes Cast:</span>
                <span>{session.votes_cast}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted:</span>
                <span>{formatDeadline(session.completed_at!)}</span>
              </div>
            </div>
          </div>

          {/* Vote Summary */}
          {votes && votes.length > 0 && (
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Your Initiative Votes
              </h3>
              <div className="space-y-3">
                {votes.map((vote) => (
                  <div
                    key={vote.id}
                    className="flex justify-between items-center py-3 border-b border-border last:border-b-0"
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
            <Button variant="outline" asChild><Link href={`/elections/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Election
              </Link></Button>

            {/* Check if candidates are available for voting */}
            <Button variant="default" asChild><Link href={`/elections/${id}/vote/candidates`}>Vote for Candidates</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
