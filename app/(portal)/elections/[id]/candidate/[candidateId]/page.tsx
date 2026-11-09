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
        <p className="text-muted-foreground mb-4">
          Could not find candidate with ID: {candidateId}
        </p>
        <p className="text-sm text-badge-red-text mb-4">
          Error: {candidateError?.message}
        </p>
        <Button variant="outline" asChild><Link href={`/elections/${electionId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Election
          </Link></Button>
      </div>
    );
  }

  // Fetch election details separately
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('title, description, start_date, end_date, status')
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
    
    // Use general election end date for candidate voting
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
      return 'bg-accent-100 text-foreground border-accent-200';
    if (position.includes('Secretary'))
      return 'bg-badge-green-bg text-badge-green-text border-badge-green-border';
    if (position.includes('Treasurer'))
      return 'bg-badge-purple-bg text-badge-purple-text border-badge-purple-border';
    return 'bg-muted text-foreground border-border';
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" className="gap-2 hover:bg-card/60" asChild><Link href={`/elections/${electionId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Election
            </Link></Button>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Candidate Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="border-0 shadow-lg bg-card/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                      <AvatarImage
                        src={candidate.photo_url || ''}
                        alt={candidate.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl font-semibold">
                        {getInitials(candidate.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name and Position */}
                  <div className="flex-grow">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
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
                    <div className="flex items-center text-sm text-muted-foreground">
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
              <Card className="border-0 shadow-lg bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5" />
                    About the Candidate
                  </h2>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {candidate.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Platform & Vision */}
            {candidateWithElection.manifesto && (
              <Card className="border-0 shadow-lg bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Vote className="h-5 w-5" />
                    Platform & Vision
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
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
            <Card className="border-0 shadow-lg bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">
                  Election Information
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    {candidateWithElection.elections?.title}
                  </h4>
                  {candidateWithElection.elections?.description && (
                    <p className="text-sm text-muted-foreground">
                      {candidateWithElection.elections.description}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  {candidateWithElection.elections?.start_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Voting Starts:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.start_date)}
                      </span>
                    </div>
                  )}

                  {candidateWithElection.elections?.end_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Voting Ends:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.end_date)}
                      </span>
                    </div>
                  )}

                  {candidateWithElection.elections?.status && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${
                          candidateVotingEnded 
                            ? 'border-border text-muted-foreground' 
                            : 'border-badge-green-border text-badge-green-text'
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
            <Card className="border-0 shadow-lg bg-card/70 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Voting Action */}
                  {user ? (
                    hasUserVoted ? (
                      <div className="space-y-2">
                        <div className="p-4 bg-badge-green-bg border border-badge-green-border rounded-lg">
                          <div className="flex items-center justify-center text-badge-green-text">
                            <Vote className="h-4 w-4 mr-2" />
                            <span className="font-medium">
                              You have already voted
                            </span>
                          </div>
                          {userVoteSession?.confirmation_code && (
                            <p className="text-xs text-badge-green-text text-center mt-2">
                              Confirmation: {userVoteSession.confirmation_code}
                            </p>
                          )}
                        </div>
                        <Button
                            variant="outline"
                            className="w-full border-badge-green-border text-badge-green-text hover:bg-badge-green-bg" asChild><Link
                          href={`/elections/${electionId}/vote/candidates/confirmation?code=${userVoteSession?.confirmation_code}`}
                          className="w-full"
                        >
                            View Vote Confirmation
                          </Link></Button>
                      </div>
                    ) : candidateVotingEnded ? (
                      <div className="p-4 bg-muted border border-border rounded-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center text-muted-foreground mb-2">
                            <Award className="h-4 w-4 mr-2" />
                            <span className="font-medium">Candidate Voting Closed</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Voting for candidates has ended for this election
                          </p>
                          <Button variant="outline" className="w-full" asChild><Link href={`/elections/${electionId}/candidate`} className="w-full">
                              View Election Results
                            </Link></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-accent-100 border border-accent-200 rounded-lg">
                        <div className="text-center">
                          <h5 className="font-medium text-foreground mb-2">
                            Ready to Vote
                          </h5>
                          <p className="text-sm text-foreground mb-3">
                            Cast your vote for {candidate.full_name}
                          </p>
                          <Button className="w-full shadow-lg" asChild><Link
                            href={`/elections/${electionId}/vote/candidates`}
                            className="w-full"
                          >
                              <Vote className="h-4 w-4 mr-2" />
                              Cast Your Vote
                            </Link></Button>
                        </div>
                      </div>
                    )
                  ) : candidateVotingEnded ? (
                    <div className="p-4 bg-muted border border-border rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-muted-foreground mb-2">
                          <Award className="h-4 w-4 mr-2" />
                          <span className="font-medium">Candidate Voting Closed</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Voting for candidates has ended for this election
                        </p>
                        <Button variant="outline" className="w-full" asChild><Link href={`/elections/${electionId}/candidate`} className="w-full">
                            View Election Results
                          </Link></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-badge-green-bg border border-badge-green-border rounded-lg">
                      <div className="text-center">
                        <h5 className="font-medium text-badge-green-text mb-2">
                          Authentication Required
                        </h5>
                        <p className="text-sm text-badge-green-text mb-3">
                          Sign in to vote for {candidate.full_name}
                        </p>
                        <Button className="w-full shadow-lg" asChild><Link
                          href={`/signin?redirectTo=${encodeURIComponent(`/elections/${electionId}/candidate/${candidateId}`)}`}
                          className="w-full"
                        >
                            <Vote className="h-4 w-4 mr-2" />
                            Sign In to Vote
                          </Link></Button>
                      </div>
                    </div>
                  )}

                  {/* View All Candidates */}
                  <Button
                      variant="outline"
                      className="w-full border-2 hover:bg-muted" asChild><Link href={`/elections/${electionId}`} className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      View All Candidates
                    </Link></Button>

                  {/* View Election Details */}
                  <Button
                      variant="ghost"
                      className="w-full text-muted-foreground hover:text-foreground" asChild><Link href={`/elections/${electionId}`} className="w-full">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Election Details
                    </Link></Button>
                </div>
              </CardContent>
            </Card>

            {/* Nomination Date */}
            {candidate.created_at && (
              <Card className="border-0 shadow-lg bg-card/70 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Nominated on</p>
                    <p className="font-medium text-foreground">
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
