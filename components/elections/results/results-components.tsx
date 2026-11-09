'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Trophy, TrendingUp, Users, Vote, BarChart3, Crown, Building } from 'lucide-react';
import { ElectionResults } from '@/hooks/useElectionResults';
import { getElectionTypeDescription, supportsUnopposedCandidates } from '@/utils/election-types';
import { ElectionType } from '@/types';

interface ResultsOverviewProps {
  results: ElectionResults;
}

export function ResultsOverview({ results }: ResultsOverviewProps) {
  const electionType = results.election.type as ElectionType;
  const supportsUnopposed = supportsUnopposedCandidates(electionType);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'voting_open':
        return 'bg-green-500';
      case 'voting_closed':
        return 'bg-red-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'voting_open':
        return 'Voting Open';
      case 'voting_closed':
        return 'Voting Closed';
      case 'completed':
        return 'Complete';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  // Get type-specific icon and styling
  const getElectionTypeIcon = (type: ElectionType) => {
    switch (type) {
      case 'leadership':
        return Crown;
      case 'board':
        return Building;
      case 'initiative':
        return Vote;
      default:
        return Users;
    }
  };

  const TypeIcon = getElectionTypeIcon(electionType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TypeIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{results.election.title}</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {getElectionTypeDescription(electionType)}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">{results.election.description}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge className={getStatusColor(results.election.status)}>
            {getStatusText(results.election.status)}
          </Badge>
          {electionType && (
            <Badge variant="outline" className="capitalize">
              {electionType} Election
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced stats cards with type-aware content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {electionType === 'initiative' ? 'Ballot Items' : 'Positions'}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.positions.length}</div>
            <p className="text-xs text-muted-foreground">
              {electionType === 'initiative' ? 'initiatives to vote on' : 'available positions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {electionType === 'initiative' ? 'Options' : 'Candidates'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {electionType === 'initiative' 
                ? results.initiativeResults.length * 3 // Yes, No, Abstain options
                : results.candidateResults.length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {supportsUnopposed && results.votingStatus.candidatesElectedUnopposed 
                ? 'including unopposed' 
                : electionType === 'initiative' ? 'total options' : 'running for office'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.statistics.totalVoters}</div>
            <p className="text-xs text-muted-foreground">
              {results.statistics.turnoutPercentage}% turnout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidate Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.statistics.candidateVotes}</div>
            <p className="text-xs text-muted-foreground">
              Leadership positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Initiative Votes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.statistics.initiativeVotes}</div>
            <p className="text-xs text-muted-foreground">
              Ballot measures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.statistics.turnoutPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Voter turnout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Voting Status Section - Show when separate voting periods are enabled */}
      {results.election.enableSeparateVotingPeriods && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Voting Status
            </CardTitle>
            <CardDescription>
              This election has separate voting periods for different ballot items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium">Candidate Voting</p>
                  <p className="text-sm text-muted-foreground">
                    {results.votingStatus.candidateVotingOpen ? 'Currently accepting votes' : 'No longer accepting votes'}
                  </p>
                </div>
                <Badge variant={results.votingStatus.candidateVotingOpen ? 'default' : 'secondary'}>
                  {results.votingStatus.candidateVotingOpen ? 'Open' : 'Closed'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium">Initiative Voting</p>
                  <p className="text-sm text-muted-foreground">
                    {results.votingStatus.initiativeVotingOpen ? 'Currently accepting votes' : 'No longer accepting votes'}
                  </p>
                </div>
                <Badge variant={results.votingStatus.initiativeVotingOpen ? 'default' : 'secondary'}>
                  {results.votingStatus.initiativeVotingOpen ? 'Open' : 'Closed'}
                </Badge>
              </div>

              {results.votingStatus.candidatesElectedUnopposed && (
                <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-blue-900">Leadership Positions</p>
                    <p className="text-sm text-blue-700">Candidate voting closed early</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    <Trophy className="w-3 h-3 mr-1" />
                    Elected Unopposed
                  </Badge>
                </div>
              )}
            </div>

            {/* Show candidate voting period details if available */}
            {results.election.candidateVotingEnd && (
              <div className="mt-4 pt-4 border-t bg-blue-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Candidate Voting Period</p>
                    <p className="text-sm text-blue-700">
                      {results.election.candidateVotingStart ? 
                        new Date(results.election.candidateVotingStart).toLocaleString() : 
                        new Date(results.election.startDate).toLocaleString()
                      } → {new Date(results.election.candidateVotingEnd).toLocaleString()}
                    </p>
                    {!results.votingStatus.candidateVotingOpen && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        💡 Candidate voting was closed before the general election end time to allow candidates to be elected unopposed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CandidateResultsProps {
  results: ElectionResults;
}

export function CandidateResults({ results }: CandidateResultsProps) {
  const groupedCandidates = results.candidateResults.reduce((acc, candidate) => {
    if (!acc[candidate.position]) {
      acc[candidate.position] = [];
    }
    acc[candidate.position].push(candidate);
    return acc;
  }, {} as Record<string, typeof results.candidateResults>);

  return (
    <div className="space-y-6">
      {/* Show unopposed status banner if applicable */}
      {results.votingStatus.candidatesElectedUnopposed && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">All Candidates Elected Unopposed</h3>
                <p className="text-sm text-blue-700">
                  Candidate voting was closed early to allow unopposed candidates to be elected to their positions. 
                  All leadership positions have been filled without requiring a competitive vote.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedCandidates).map(([position, candidates]) => (
        <Card key={position}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {position}
            </CardTitle>
            <CardDescription>
              {candidates.reduce((sum, c) => sum + c.voteCount, 0)} total votes cast
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidates.map((candidate, index) => (
              <div key={candidate.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={candidate.photoUrl} alt={candidate.fullName} />
                      <AvatarFallback>
                        {candidate.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{candidate.fullName}</p>
                        {index === 0 && candidate.voteCount > 0 && (
                          <Badge variant="default" className="bg-yellow-500 text-white">
                            <Trophy className="h-3 w-3 mr-1" />
                            Leading
                          </Badge>
                        )}
                      </div>
                      {candidate.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {candidate.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{candidate.voteCount} votes</p>
                    <p className="text-sm text-muted-foreground">{candidate.percentage}%</p>
                  </div>
                </div>
                <Progress value={candidate.percentage} className="h-2" />
                {index < candidates.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface InitiativeResultsProps {
  results: ElectionResults;
}

export function InitiativeResults({ results }: InitiativeResultsProps) {
  return (
    <div className="space-y-6">
      {results.initiativeResults.map((initiative) => (
        <Card key={initiative.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {initiative.title}
            </CardTitle>
            {initiative.description && (
              <CardDescription>{initiative.description}</CardDescription>
            )}
            <div className="text-sm text-muted-foreground">
              {initiative.totalVotes} total votes cast
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="font-medium">Yes</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{initiative.votes.yes} votes</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({initiative.percentages.yes}%)
                  </span>
                </div>
              </div>
              <Progress value={initiative.percentages.yes} className="h-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="font-medium">No</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{initiative.votes.no} votes</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({initiative.percentages.no}%)
                  </span>
                </div>
              </div>
              <Progress value={initiative.percentages.no} className="h-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="font-medium">Abstain</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{initiative.votes.abstain} votes</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({initiative.percentages.abstain}%)
                  </span>
                </div>
              </div>
              <Progress value={initiative.percentages.abstain} className="h-2" />
            </div>

            {/* Result indicator */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-center">
                {initiative.votes.yes > initiative.votes.no ? (
                  <Badge variant="default" className="bg-green-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Currently Passing
                  </Badge>
                ) : initiative.votes.no > initiative.votes.yes ? (
                  <Badge variant="destructive">
                    Currently Failing
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Tied
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
