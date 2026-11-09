import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Vote, Download } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VoteConfirmationPage(props: Props) {
  const params = await props.params;
  const { id } = params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  // Get election details
  const { data: election } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  if (!election) {
    notFound();
  }

  // Get user's votes
  const { data: userVotes } = await supabase
    .from('votes')
    .select(`
      id,
      candidate_id,
      initiative_id,
      vote_value,
      voted_at,
      candidates(full_name, position),
      initiatives(title)
    `)
    .eq('user_id', user.id)
    .eq('election_id', id);

  // Get vote confirmation
  const { data: voteConfirmation } = await supabase
    .from('vote_confirmations')
    .select('confirmation_code, votes_cast, confirmed_at')
    .eq('user_id', user.id)
    .eq('election_id', id)
    .single();

  if (!userVotes || userVotes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">No Votes Found</CardTitle>
            <CardDescription className="text-center">
              We couldn't find any votes for this election.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href={`/elections/${id}`}>
              <Button>Back to Election</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const candidateVotes = userVotes.filter(vote => vote.candidate_id);
  const initiativeVotes = userVotes.filter(vote => vote.initiative_id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Confirmation Header */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-6 h-6" />
              Vote Confirmed
            </CardTitle>
            <CardDescription className="text-green-700">
              Your vote has been successfully recorded for "{election.title}".
              {voteConfirmation && (
                <span className="block mt-2 font-medium">
                  Confirmation Code: <code className="bg-white px-2 py-1 rounded text-sm">{voteConfirmation.confirmation_code}</code>
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Vote Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              Your Vote Summary
            </CardTitle>
            <CardDescription>
              Review the votes you submitted for this election.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Candidate Votes */}
            {candidateVotes.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Leadership Votes</h3>
                <div className="space-y-3">
                  {candidateVotes.map((vote) => (
                    <div key={vote.id} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">
                          {vote.candidates?.position}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-700">
                          {vote.candidates?.full_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Initiative Votes */}
            {initiativeVotes.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Initiative Votes</h3>
                <div className="space-y-3">
                  {initiativeVotes.map((vote) => (
                    <div key={vote.id} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">
                          {vote.initiatives?.title}
                        </span>
                      </div>
                      <div>
                        <Badge variant={vote.vote_value === 'yes' ? 'default' : vote.vote_value === 'no' ? 'destructive' : 'secondary'}>
                          {vote.vote_value === 'yes' ? 'Yes' : vote.vote_value === 'no' ? 'No' : 'Abstain'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vote Details */}
            {voteConfirmation && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Votes Cast:</span> {voteConfirmation.votes_cast}
                  </div>
                  {voteConfirmation.confirmed_at && (
                    <div>
                      <span className="font-medium">Submitted:</span> {new Date(voteConfirmation.confirmed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-blue-800">
              <h4 className="font-semibold">Important Information:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Your vote has been recorded and cannot be changed</li>
                <li>Please save your confirmation code for your records</li>
                <li>You will receive an email confirmation shortly</li>
                <li>Results will be announced after the voting period ends</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardFooter className="flex flex-wrap gap-3 justify-center">
            <Link href={`/elections/${id}`}>
              <Button variant="outline">
                Back to Election
              </Button>
            </Link>
            <Link href="/elections">
              <Button variant="outline">
                View All Elections
              </Button>
            </Link>
            {/* Future: Add download receipt button */}
            {/* <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Receipt
            </Button> */}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
