'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Trophy, TrendingUp, Users, Vote, BarChart3 } from 'lucide-react';
import { ElectionResults } from '@/hooks/useElectionResults';

interface ResultsOverviewProps {
  results: ElectionResults;
}

export function ResultsOverview({ results }: ResultsOverviewProps) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{results.election.title}</h1>
          <p className="text-muted-foreground mt-1">{results.election.description}</p>
        </div>
        <Badge className={getStatusColor(results.election.status)}>
          {getStatusText(results.election.status)}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
