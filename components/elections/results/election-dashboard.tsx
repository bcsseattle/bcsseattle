'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ElectionResults } from '@/hooks/useElectionResults';
import { Activity, Clock, TrendingUp, Zap, Trophy } from 'lucide-react';

interface ElectionDashboardProps {
  results: ElectionResults;
  lastUpdated: Date;
}

export function ElectionDashboard({ results, lastUpdated }: ElectionDashboardProps) {
  const isVotingActive = results.election.status === 'voting_open';
  const timeUntilEnd = new Date(results.election.endDate).getTime() - new Date().getTime();
  const hoursUntilEnd = Math.max(0, Math.floor(timeUntilEnd / (1000 * 60 * 60)));
  const minutesUntilEnd = Math.max(0, Math.floor((timeUntilEnd % (1000 * 60 * 60)) / (1000 * 60)));

  // Enhanced status messaging for separate voting periods
  const getStatusMessage = () => {
    if (results.election.enableSeparateVotingPeriods) {
      const candidateOpen = results.votingStatus.candidateVotingOpen;
      const initiativeOpen = results.votingStatus.initiativeVotingOpen;
      
      if (candidateOpen && initiativeOpen) {
        return 'All voting is currently open';
      } else if (!candidateOpen && initiativeOpen) {
        return 'Initiative voting is open, candidate voting closed';
      } else if (candidateOpen && !initiativeOpen) {
        return 'Candidate voting is open, initiative voting closed';
      } else {
        return 'All voting has ended';
      }
    }
    
    return isVotingActive ? 'Voting is currently open' : 'Voting has ended';
  };

  const getStatusColor = () => {
    if (results.election.enableSeparateVotingPeriods) {
      const candidateOpen = results.votingStatus.candidateVotingOpen;
      const initiativeOpen = results.votingStatus.initiativeVotingOpen;
      
      if (candidateOpen || initiativeOpen) {
        return candidateOpen && initiativeOpen ? 'green' : 'yellow';
      }
      return 'gray';
    }
    
    return isVotingActive ? 'green' : 'gray';
  };

  const statusColor = getStatusColor();

  // Calculate leading candidates
  const leadingCandidates = results.positions.map(position => {
    const candidatesForPosition = results.candidateResults.filter(c => c.position === position);
    const leader = candidatesForPosition.reduce((prev, current) => 
      current.voteCount > prev.voteCount ? current : prev
    );
    return { position, leader };
  });

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={`border-l-4 ${
        statusColor === 'green'
          ? 'border-l-green-500 bg-green-50 dark:bg-green-950' 
          : statusColor === 'yellow'
          ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'
          : 'border-l-gray-500 bg-gray-50 dark:bg-gray-950'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                statusColor === 'green' 
                  ? 'bg-green-100 dark:bg-green-900' 
                  : statusColor === 'yellow'
                  ? 'bg-yellow-100 dark:bg-yellow-900'
                  : 'bg-gray-100 dark:bg-gray-900'
              }`}>
                {statusColor === 'gray' ? (
                  <Clock className={`h-5 w-5 text-gray-600 dark:text-gray-400`} />
                ) : (
                  <Activity className={`h-5 w-5 ${
                    statusColor === 'green' 
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">Election Status</h3>
                <p className="text-sm text-muted-foreground">
                  {getStatusMessage()}
                </p>
              </div>
            </div>
            <div className="text-right">
              {isVotingActive && timeUntilEnd > 0 && (
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {hoursUntilEnd}h {minutesUntilEnd}m
                  </p>
                  <p className="text-sm text-muted-foreground">remaining</p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.statistics.turnoutPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {results.statistics.totalVoters} voters participated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes Cast</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.statistics.candidateVotes + results.statistics.initiativeVotes}
            </div>
            <p className="text-xs text-muted-foreground">
              {results.statistics.candidateVotes} candidates + {results.statistics.initiativeVotes} initiatives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.positions.length}</div>
            <p className="text-xs text-muted-foreground">
              Leadership positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{lastUpdated.toLocaleTimeString()}</div>
            <p className="text-xs text-muted-foreground">
              {isVotingActive && (
                <span className="inline-flex items-center text-green-600">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Live updates
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Leaders */}
      {leadingCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {results.votingStatus?.candidatesElectedUnopposed ? 'Elected Leaders' : 'Current Leaders'}
            </CardTitle>
            <CardDescription>
              {results.votingStatus?.candidatesElectedUnopposed 
                ? 'Final results - all candidates elected unopposed'
                : `Leading candidates by position (as of ${lastUpdated.toLocaleTimeString()})`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadingCandidates.map(({ position, leader }) => (
                <div key={position} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{position}</p>
                    <p className="text-sm text-muted-foreground">{leader.fullName}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={
                      results.votingStatus?.candidatesElectedUnopposed
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-yellow-50 border-yellow-200 text-yellow-800"
                    }>
                      {results.votingStatus?.candidatesElectedUnopposed ? (
                        <>
                          <Trophy className="w-3 h-3 mr-1" />
                          Elected
                        </>
                      ) : (
                        `${leader.voteCount} votes (${leader.percentage}%)`
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
