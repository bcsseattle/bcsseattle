import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Mail, User, Vote, ArrowLeft, Award } from 'lucide-react';
import Link from 'next/link';
import { useServerFeatureFlag } from '@/utils/server-feature-flags';
import {
  FEATURE_FLAGS,
  createFeatureFlagArray
} from '@/utils/feature-flag-constants';

type Props = {
  params: Promise<{ id: string; candidateId: string }>;
  searchParams: Promise<{ configoverride?: string }>;
};

export default async function CandidatePage2(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { id: electionId, candidateId } = params;
  const supabase = await createClient();

  // Check feature flags for authentication override
  const requiredFlags = createFeatureFlagArray(
    FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK,
    FEATURE_FLAGS.ENABLE_DEBUG_MODE
  );
  const featureFlags = await useServerFeatureFlag(
    requiredFlags,
    searchParams.configoverride
  );

  // Get current user
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Require authentication unless feature flag allows bypass
  if (!user && !featureFlags[FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK]) {
    const currentUrl = `/elections/${electionId}/candidate/${candidateId}`;
    const signInUrl = `/signin?redirectTo=${encodeURIComponent(currentUrl)}`;
    redirect(signInUrl);
  }

  // Fetch candidate details first
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (candidateError || !candidate) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Candidate Not Found</h1>
        <p className="text-gray-600 mb-4">
          Could not find candidate with ID: {candidateId}
        </p>
        <p className="text-sm text-red-600 mb-4">
          Error: {candidateError?.message}
        </p>
        <Link href={`/elections/${electionId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Election
          </Button>
        </Link>
      </div>
    );
  }

  // Fetch election details separately
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('title, description, start_date, end_date, status, candidate_voting_end, enable_separate_voting_periods, show_unopposed_status')
    .eq('id', candidate.election_id!!)
    .single();

  // Combine the data
  const candidateWithElection = {
    ...candidate,
    elections: election
  };

  // Check if current user has already voted (only if authenticated)
  let hasUserVoted = false;
  let userVoteSession = null;

  if (user) {
    const { data: voteSession } = await supabase
      .from('vote_sessions')
      .select('id, confirmation_code, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', electionId)
      .eq('session_type', 'candidates')
      .maybeSingle();

    hasUserVoted = !!voteSession?.completed_at;
    userVoteSession = voteSession;
  }

  // Check if candidate voting has ended
  const isCandidateVotingEnded = () => {
    if (!election) return false;
    
    const now = new Date();
    const generalEndDate = new Date(election.end_date);
    
    // If separate voting periods are enabled, check candidate-specific end date
    if (election.enable_separate_voting_periods && election.candidate_voting_end) {
      const candidateEndDate = new Date(election.candidate_voting_end);
      return now > candidateEndDate;
    }
    
    // Otherwise, use general election end date
    return now > generalEndDate;
  };

  const candidateVotingEnded = isCandidateVotingEnded();

  // Get candidate's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get position color for badge
  const getPositionColor = (position: string) => {
    if (position.includes('President'))
      return 'bg-blue-100 text-blue-800 border-blue-200';
    if (position.includes('Secretary'))
      return 'bg-green-100 text-green-800 border-green-200';
    if (position.includes('Treasurer'))
      return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={`/elections/${electionId}`}>
            <Button variant="ghost" className="gap-2 hover:bg-white/60">
              <ArrowLeft className="h-4 w-4" />
              Back to Election
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Candidate Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage
                        src={candidate.photo_url || ''}
                        alt={candidate.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {getInitials(candidate.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name and Position */}
                  <div className="flex-grow">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {candidate.full_name}
                    </h1>
                    <Badge
                      variant="secondary"
                      className={`text-sm px-3 py-1 ${getPositionColor(candidate.position)} font-medium mb-4`}
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Running for {candidate.position}
                    </Badge>

                    {/* Election Info */}
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <span>
                        Election: {candidateWithElection.elections?.title}
                        {candidateWithElection.elections?.start_date &&
                          ` • ${formatDate(candidateWithElection.elections.start_date)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Bio Section */}
            {candidate.bio && (
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    About the Candidate
                  </h2>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {candidate.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Platform & Vision */}
            {candidateWithElection.manifesto && (
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Vote className="h-5 w-5" />
                    Platform & Vision
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {candidateWithElection.manifesto}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Election Info & Actions */}
          <div className="space-y-6">
            {/* Election Details */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Election Information
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {candidateWithElection.elections?.title}
                  </h4>
                  {candidateWithElection.elections?.description && (
                    <p className="text-sm text-gray-600">
                      {candidateWithElection.elections.description}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  {candidateWithElection.elections?.start_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voting Starts:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.start_date)}
                      </span>
                    </div>
                  )}

                  {/* Show candidate-specific end date if different from general election */}
                  {candidateWithElection.elections?.enable_separate_voting_periods && 
                   candidateWithElection.elections?.candidate_voting_end ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Candidate Voting Ends:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.candidate_voting_end)}
                      </span>
                    </div>
                  ) : candidateWithElection.elections?.end_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voting Ends:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.end_date)}
                      </span>
                    </div>
                  )}

                  {/* Show general election end date if candidate voting ends earlier */}
                  {candidateWithElection.elections?.enable_separate_voting_periods && 
                   candidateWithElection.elections?.candidate_voting_end &&
                   candidateWithElection.elections?.end_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Election Ends:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.end_date)}
                      </span>
                    </div>
                  )}

                  {candidateWithElection.elections?.status && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${
                          candidateVotingEnded 
                            ? 'border-gray-300 text-gray-600' 
                            : 'border-green-300 text-green-700'
                        }`}
                      >
                        {candidateVotingEnded 
                          ? 'Candidate Voting Closed' 
                          : candidateWithElection.elections.status.replace('_', ' ')
                        }
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Voting Action */}
                  {user ? (
                    hasUserVoted ? (
                      <div className="space-y-2">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-center text-green-800">
                            <Vote className="h-4 w-4 mr-2" />
                            <span className="font-medium">
                              You have already voted
                            </span>
                          </div>
                          {userVoteSession?.confirmation_code && (
                            <p className="text-xs text-green-600 text-center mt-2">
                              Confirmation: {userVoteSession.confirmation_code}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/elections/${electionId}/vote/candidates/confirmation?code=${userVoteSession?.confirmation_code}`}
                          className="w-full"
                        >
                          <Button
                            variant="outline"
                            className="w-full border-green-300 text-green-700 hover:bg-green-50"
                          >
                            View Vote Confirmation
                          </Button>
                        </Link>
                      </div>
                    ) : candidateVotingEnded ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center text-gray-600 mb-2">
                            <Award className="h-4 w-4 mr-2" />
                            <span className="font-medium">Candidate Voting Closed</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Voting for candidates has ended for this election
                          </p>
                          <Link href={`/elections/${electionId}/candidate`} className="w-full">
                            <Button variant="outline" className="w-full">
                              View Election Results
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-center">
                          <h5 className="font-medium text-blue-900 mb-2">
                            Ready to Vote
                          </h5>
                          <p className="text-sm text-blue-700 mb-3">
                            Cast your vote for {candidate.full_name}
                          </p>
                          <Link
                            href={`/elections/${electionId}/vote/candidates`}
                            className="w-full"
                          >
                            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                              <Vote className="h-4 w-4 mr-2" />
                              Cast Your Vote
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  ) : candidateVotingEnded ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-gray-600 mb-2">
                          <Award className="h-4 w-4 mr-2" />
                          <span className="font-medium">Candidate Voting Closed</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Voting for candidates has ended for this election
                        </p>
                        <Link href={`/elections/${electionId}/candidate`} className="w-full">
                          <Button variant="outline" className="w-full">
                            View Election Results
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="text-center">
                        <h5 className="font-medium text-emerald-900 mb-2">
                          Authentication Required
                        </h5>
                        <p className="text-sm text-emerald-700 mb-3">
                          Sign in to vote for {candidate.full_name}
                        </p>
                        <Link
                          href={`/signin?redirectTo=${encodeURIComponent(`/elections/${electionId}/candidate/${candidateId}`)}`}
                          className="w-full"
                        >
                          <Button className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg">
                            <Vote className="h-4 w-4 mr-2" />
                            Sign In to Vote
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* View All Candidates */}
                  <Link href={`/elections/${electionId}`} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full border-2 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 mr-2" />
                      View All Candidates
                    </Button>
                  </Link>

                  {/* View Election Details */}
                  <Link href={`/elections/${electionId}`} className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-800"
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Election Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Nomination Date */}
            {candidate.created_at && (
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Nominated on</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(candidate.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
