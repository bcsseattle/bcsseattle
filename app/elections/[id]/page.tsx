import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Trophy, UserPlus, Clock, AlertCircle, Crown, Building } from 'lucide-react';
import VotingForm from '@/components/elections/voting-form';
import LeadershipPositions from '@/components/leadership-positions';
import Candidates from '@/components/elections/candidates';
import dayjs from '@/libs/dayjs';
import { Database } from '@/types_db';
import { getElectionTypeDescription, supportsUnopposedCandidates } from '@/utils/election-types';
import { ElectionType } from '@/types';

// Import voting period helper functions
import {
  isCandidateVotingOpen,
  getCandidateVotingPeriod,
  shouldShowUnopposedStatus
} from '@/utils/election-config';

type Election = Database['public']['Tables']['elections']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];
type Initiative = Database['public']['Tables']['initiatives']['Row'];

interface ElectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ElectionPage({ params }: ElectionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch election details
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: election, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  if (!election || error) {
    redirect('/404');
  }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('election_id', election.id)
    .order('position');

  // Fetch initiatives for this election
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('*')
    .eq('election_id', election.id)
    .order('ballot_order');

  // Check if user has voted for candidates and initiatives separately
  let hasCandidateVotes = false;
  let hasInitiativeVotes = false;
  let userVotes = null;
  let candidateSession = null;
  let initiativeSession = null;

  if (user) {
    // Check for candidate votes
    const { data: candidateSessionData } = await supabase
      .from('vote_sessions')
      .select('id, confirmation_code, votes_cast, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', id)
      .eq('session_type', 'candidates')
      .single();

    hasCandidateVotes = !!candidateSessionData?.completed_at;
    candidateSession = candidateSessionData;

    // Check for initiative votes
    const { data: initiativeSessionData } = await supabase
      .from('vote_sessions')
      .select('id, confirmation_code, votes_cast, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', id)
      .eq('session_type', 'initiatives')
      .single();

    hasInitiativeVotes = !!initiativeSessionData?.completed_at;
    initiativeSession = initiativeSessionData;

    // Get all user votes for display
    if (hasCandidateVotes || hasInitiativeVotes) {
      const { data: userVotesData } = await supabase
        .from('votes')
        .select(
          `
          id,
          candidate_id,
          initiative_id,
          vote_value,
          voted_at,
          vote_type,
          candidates(full_name, position),
          initiatives(title)
        `
        )
        .eq('user_id', user.id)
        .eq('election_id', id);

      userVotes = userVotesData;
    }
  }

  async function getPositionOrder(
    electionType: string,
    candidates: Candidate[]
  ) {
    // Try to fetch from database first
    const { data: dbPositions } = await supabase
      .from('election_positions')
      .select('position, description, display_order')
      .eq('election_type', electionType)
      .order('display_order');

    if (dbPositions?.length) {
      return dbPositions;
    }

    // Fallback to hardcoded positions based on election type
    const defaultPositions = {
      leadership: [
        {
          position: 'President',
          description:
            'Chief executive officer who leads the organization and represents it publicly',
          display_order: 1
        },
        {
          position: 'Vice President',
          description:
            'Second in command who assists the president and steps in when needed',
          display_order: 2
        },
        {
          position: 'Secretary',
          description:
            'Records meeting minutes, manages correspondence, and maintains official documents',
          display_order: 3
        },
        {
          position: 'Treasurer',
          description:
            'Manages organizational finances, budget, and financial reporting',
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
          description:
            'Participates in board decisions and organizational governance',
          display_order: 2
        }
      ],
      committee: [
        {
          position: 'Committee Chair',
          description:
            'Leads committee activities and coordinates with the board',
          display_order: 1
        },
        {
          position: 'Committee Member',
          description:
            'Participates in committee work and supports committee goals',
          display_order: 2
        }
      ]
    };

    const typePositions =
      defaultPositions[electionType as keyof typeof defaultPositions];
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

  const positionOrder = await getPositionOrder(
    election.type!!,
    candidates || []
  );

  // Use consistent UTC for all date comparisons to avoid timezone issues
  const nowUtc = dayjs.utc();
  const startUtc = dayjs.utc(election.start_date);
  const endUtc = dayjs.utc(election.end_date);

  // Configuration for separate candidate/initiative voting periods
  const candidateVotingOpen = await isCandidateVotingOpen(id, nowUtc);
  const isInitiativeVotingOpen = (nowUtc.isAfter(startUtc) || nowUtc.isSame(startUtc)) && (nowUtc.isBefore(endUtc) || nowUtc.isSame(endUtc));
  
  const isVotingOpen = candidateVotingOpen || isInitiativeVotingOpen;
  const isUpcoming = nowUtc.isBefore(startUtc);
  const isClosed = nowUtc.isAfter(endUtc);
  
  // Determine if candidates were elected unopposed
  const candidatesElectedUnopposed = await shouldShowUnopposedStatus(id, candidateVotingOpen, !!(candidates && candidates.length > 0));

  // Get candidate voting period for display
  const candidateVotingPeriod = await getCandidateVotingPeriod(id);

  // Fix timezone issue by ensuring consistent UTC comparison
  const isNominationOpen =
    election.nomination_start &&
    election.nomination_end &&
    dayjs.utc(election.nomination_start).isBefore(nowUtc) &&
    nowUtc.isBefore(dayjs.utc(election.nomination_end));

  // Helper function to get election status
  function getElectionStatus() {
    if (isNominationOpen)
      return {
        label: 'Nominations Open',
        variant: 'default' as const,
        icon: UserPlus
      };
    if (isVotingOpen)
      return {
        label: 'Voting Open',
        variant: 'destructive' as const,
        icon: Vote
      };
    if (isClosed)
      return {
        label: 'Completed',
        variant: 'secondary' as const,
        icon: Trophy
      };
    if (isUpcoming)
      return { label: 'Upcoming', variant: 'outline' as const, icon: Clock };
    return {
      label: 'Closed',
      variant: 'secondary' as const,
      icon: AlertCircle
    };
  }

  const status = getElectionStatus();

  // Get election type information for enhanced display
  const electionType = election.type as ElectionType;
  const typeDescription = getElectionTypeDescription(electionType);
  const supportsUnopposed = supportsUnopposedCandidates(electionType);

  // Get type-specific icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leadership':
        return Crown;
      case 'board':
        return Building;
      case 'initiative':
        return Vote;
      default:
        return Trophy;
    }
  };

  const TypeIcon = getTypeIcon(election.type || 'leadership');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <TypeIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <CardTitle className="text-3xl">{election.title}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize mt-1">
                    {typeDescription}
                  </p>
                </div>
              </div>
              <CardDescription className="text-lg">
                {election.description}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant={status.variant} className="flex items-center gap-1">
                <status.icon className="w-3 h-3" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {election.type} Election
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Type-specific context */}
          {supportsUnopposed && candidatesElectedUnopposed && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Candidates Elected Unopposed</p>
                  <p className="text-sm text-blue-700">
                    All candidates for this {election.type} election are running unopposed and have been automatically elected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Election Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {election.nomination_start && election.nomination_end && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Nomination Period</p>
                  <p className="text-sm text-blue-700">
                    {dayjs.utc(election.nomination_start).tz('America/Los_Angeles').format('MMM D, h:mm A')} →{' '}
                    {dayjs.utc(election.nomination_end).tz('America/Los_Angeles').format('MMM D, h:mm A')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Vote className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">General Voting Period</p>
                <p className="text-sm text-green-700">
                  {dayjs.utc(election.start_date).tz('America/Los_Angeles').format('MMM D, h:mm A')} →{' '}
                  {dayjs.utc(election.end_date).tz('America/Los_Angeles').format('MMM D, h:mm A')}
                </p>
              </div>
            </div>

            {/* Candidate Voting Period - Show only if separate periods are enabled */}
            {candidateVotingPeriod.end && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg md:col-span-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Candidate Voting Period</p>
                  <p className="text-sm text-purple-700">
                    {candidateVotingPeriod.start ? 
                      dayjs.utc(candidateVotingPeriod.start).tz('America/Los_Angeles').format('MMM D, h:mm A') : 
                      dayjs.utc(election.start_date).tz('America/Los_Angeles').format('MMM D, h:mm A')
                    } →{' '}
                    {dayjs.utc(candidateVotingPeriod.end).tz('America/Los_Angeles').format('MMM D, h:mm A')}
                  </p>
                  {!candidateVotingOpen && (
                    <p className="text-xs text-purple-600 mt-1">
                      ⚠️ Candidate voting has ended early
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Position Information */}
          {positionOrder.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <LeadershipPositions positions={positionOrder} />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* Nomination Section */}
          {isNominationOpen && (
            <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">
                    Nominations Open
                  </h4>
                  <p className="text-sm text-blue-700">
                    Submit your nomination for this election
                  </p>
                </div>
                <Link href={`/elections/${election.id}/nominate`}>
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Nominate Yourself
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!isNominationOpen && !isVotingOpen && !isClosed && (
            <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-center">
                <Button
                  disabled
                  variant="outline"
                  size="lg"
                  className="cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Nominations Closed
                </Button>
              </div>
            </div>
          )}

          {/* Voting Section - Not Signed In */}
          {isVotingOpen && !user && (
            <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-green-900">
                    Voting is Open
                  </h4>
                  <p className="text-sm text-green-700">
                    Sign in to cast your vote
                  </p>
                </div>
                <Link
                  href={`/signin?redirectTo=${encodeURIComponent(`/elections/${id}`)}`}
                >
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  >
                    <Vote className="w-5 h-5 mr-2" />
                    Sign In to Vote
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Voting Section - Signed In */}
          {isVotingOpen && user && (
            <div className="w-full space-y-3">
              <h4 className="font-semibold text-gray-900 mb-3">
                Cast Your Vote
              </h4>

              {/* Candidate Voting */}
              {candidates && candidates.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-green-900">
                        Candidate Elections
                      </h5>
                      {candidatesElectedUnopposed ? (
                        <p className="text-sm text-green-700">
                          All candidates elected unopposed
                        </p>
                      ) : (
                        <p className="text-sm text-green-700">
                          Vote for leadership positions
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {candidatesElectedUnopposed ? (
                        <Badge
                          variant="secondary"
                          className="px-3 py-2 bg-blue-100 text-blue-800 border-blue-300"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          Elected Unopposed
                        </Badge>
                      ) : !hasCandidateVotes && candidateVotingOpen ? (
                        <Link
                          href={`/elections/${election.id}/vote/candidates`}
                        >
                          <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                          >
                            <Vote className="w-5 h-5 mr-2" />
                            Vote for Candidates
                          </Button>
                        </Link>
                      ) : !hasCandidateVotes ? (
                        <Badge
                          variant="secondary"
                          className="px-3 py-2 bg-gray-100 text-gray-800 border-gray-300"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Candidate Voting Closed
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="secondary"
                            className="px-3 py-2 bg-green-100 text-green-800 border-green-300"
                          >
                            <Vote className="w-4 h-4 mr-2" />
                            Candidates Voted ✓
                          </Badge>
                          {candidateSession?.confirmation_code && (
                            <Link
                              href={`/elections/${election.id}/vote/candidates/confirmation?code=${candidateSession.confirmation_code}`}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-50"
                              >
                                View Confirmation
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Initiative Voting */}
              {initiatives && initiatives.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-purple-900">
                        Ballot Initiatives
                      </h5>
                      <p className="text-sm text-purple-700">
                        Vote on community proposals
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!hasInitiativeVotes ? (
                        <Link
                          href={`/elections/${election.id}/vote/initiatives`}
                        >
                          <Button
                            size="lg"
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
                          >
                            <Vote className="w-5 h-5 mr-2" />
                            Vote on Initiatives
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="secondary"
                            className="px-3 py-2 bg-purple-100 text-purple-800 border-purple-300"
                          >
                            <Vote className="w-4 h-4 mr-2" />
                            Initiatives Voted ✓
                          </Badge>
                          {initiativeSession?.confirmation_code && (
                            <Link
                              href={`/elections/${election.id}/vote/initiatives/confirmation?code=${initiativeSession.confirmation_code}`}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
                                View Confirmation
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback to combined voting */}
              {(!candidates || candidates.length === 0) &&
                (!initiatives || initiatives.length === 0) && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-green-900">
                          General Voting
                        </h5>
                        <p className="text-sm text-green-700">
                          Cast your vote in this election
                        </p>
                      </div>
                      <Link href={`/elections/${election.id}/vote`}>
                        <Button
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        >
                          <Vote className="w-5 h-5 mr-2" />
                          Vote Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Results Section - Live Results for Active Elections */}
          {isVotingOpen && (
            <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">
                    Live Results
                  </h4>
                  <p className="text-sm text-blue-700">
                    View real-time election results while voting is open
                  </p>
                </div>
                <Link href={`/elections/${election.id}/results`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    View Live Results
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Results Section - Final Results for Closed Elections */}
          {isClosed && (
            <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-amber-900">
                    Election Complete
                  </h4>
                  <p className="text-sm text-amber-700">
                    View the final results
                  </p>
                </div>
                <Link href={`/elections/${election.id}/results`}>
                  <Button
                    size="lg"
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    View Results
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Candidates Section */}
      {candidates && candidates.length > 0 && (
        <Candidates
          candidates={candidates}
          election={election}
          positionOrder={positionOrder}
          isNominationOpen={isNominationOpen}
          candidatesElectedUnopposed={candidatesElectedUnopposed}
          candidateVotingOpen={candidateVotingOpen}
        />
      )}

      {/* Initiatives Section */}
      {initiatives && initiatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              Ballot Initiatives
            </CardTitle>
            <CardDescription>
              Review the ballot measures for this election. You can vote Yes or
              No on each initiative.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {initiatives.map((initiative, index) => (
              <div
                key={initiative.id}
                className="border-l-4 border-blue-500 pl-4 py-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">
                      Initiative {index + 1}: {initiative.title}
                    </h4>
                    {initiative.description && (
                      <p className="text-gray-600 mb-2">
                        {initiative.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* User Voting Status */}
      {(hasCandidateVotes || hasInitiativeVotes) && userVotes && (
        <div className="space-y-4">
          {/* Candidate Vote Summary */}
          {hasCandidateVotes && candidateSession && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Vote className="w-5 h-5" />
                  Your Candidate Votes
                </CardTitle>
                <CardDescription className="text-green-700">
                  You have successfully submitted your candidate votes.
                  <span className="block mt-1 font-medium">
                    Confirmation Code: {candidateSession.confirmation_code}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Candidate Votes */}
                {userVotes
                  .filter(
                    (vote) =>
                      vote.candidate_id && vote.vote_type === 'candidates'
                  )
                  .map((vote) => (
                    <div
                      key={vote.id}
                      className="flex justify-between items-center py-2 border-b border-green-200 last:border-b-0"
                    >
                      <span className="font-medium text-green-800">
                        {vote.candidates?.position}
                      </span>
                      <span className="text-green-700">
                        {vote.candidates?.full_name}
                      </span>
                    </div>
                  ))}

                <div className="mt-4 pt-3 border-t border-green-200">
                  {candidateSession.completed_at && (
                    <p className="text-sm text-green-600">
                      Voted on:{' '}
                      {new Date(candidateSession.completed_at).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-green-600">
                    Candidate votes cast: {candidateSession.votes_cast}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Initiative Vote Summary */}
          {hasInitiativeVotes && initiativeSession && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Vote className="w-5 h-5" />
                  Your Initiative Votes
                </CardTitle>
                <CardDescription className="text-blue-700">
                  You have successfully submitted your initiative votes.
                  <span className="block mt-1 font-medium">
                    Confirmation Code: {initiativeSession.confirmation_code}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Initiative Votes */}
                {userVotes
                  .filter(
                    (vote) =>
                      vote.initiative_id && vote.vote_type === 'initiatives'
                  )
                  .map((vote) => (
                    <div
                      key={vote.id}
                      className="flex justify-between items-center py-2 border-b border-blue-200 last:border-b-0"
                    >
                      <span className="font-medium text-blue-800">
                        {vote.initiatives?.title}
                      </span>
                      <Badge
                        variant={
                          vote.vote_value === 'yes' ? 'default' : 'secondary'
                        }
                      >
                        {vote.vote_value === 'yes'
                          ? 'Yes'
                          : vote.vote_value === 'no'
                            ? 'No'
                            : 'Abstain'}
                      </Badge>
                    </div>
                  ))}

                <div className="mt-4 pt-3 border-t border-blue-200">
                  {initiativeSession.completed_at && (
                    <p className="text-sm text-blue-600">
                      Voted on:{' '}
                      {new Date(
                        initiativeSession.completed_at
                      ).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-blue-600">
                    Initiative votes cast: {initiativeSession.votes_cast}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
