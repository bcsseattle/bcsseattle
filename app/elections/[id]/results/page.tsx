'use client';

import { useParams } from 'next/navigation';
import { useElectionResults } from '@/hooks/useElectionResults';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trophy, TrendingUp, BarChart3, Crown, Building, Vote } from 'lucide-react';
import { 
  ResultsOverview, 
  CandidateResults, 
  InitiativeResults 
} from '@/components/elections/results/results-components';
import { ElectionDashboard } from '@/components/elections/results/election-dashboard';
import { VotingExplainer } from '@/components/elections/results/voting-explainer';
import { getElectionTypeDescription } from '@/utils/election-types';
import { ElectionType } from '@/types';

export default function ElectionResultsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { results, loading, error, lastUpdated, refetch } = useElectionResults(id);

  // Get type-specific icon for the page
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

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading election results...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
            <Button 
              onClick={() => refetch()} 
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p>No results available for this election.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const electionType = results.election.type as ElectionType;
  const TypeIcon = getTypeIcon(results.election.type);
  const typeDescription = getElectionTypeDescription(electionType);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Enhanced Page Header with Type Information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TypeIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold">Election Results</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{typeDescription}</p>
              <Badge variant="outline" className="capitalize">
                {results.election.type} Election
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Type-aware Voting Explainer */}
      <VotingExplainer results={results} />

      {/* Dashboard */}
      <ElectionDashboard results={results} lastUpdated={lastUpdated} />

      {/* Results Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="candidates">
            <Trophy className="h-4 w-4 mr-2" />
            Leadership Results
          </TabsTrigger>
          {results.initiativeResults.length > 0 && (
            <TabsTrigger value="initiatives">
              <TrendingUp className="h-4 w-4 mr-2" />
              Initiative Results
            </TabsTrigger>
          )}
          <TabsTrigger value="details">
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ResultsOverview results={results} />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidateResults results={results} />
        </TabsContent>

        {results.initiativeResults.length > 0 && (
          <TabsContent value="initiatives">
            <InitiativeResults results={results} />
          </TabsContent>
        )}

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Election Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm font-medium">Start Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(results.election.startDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">End Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(results.election.endDate).toLocaleString()}
                      </p>
                    </div>
                    {results.election.candidateVotingEnd && (
                      <div>
                        <p className="text-sm font-medium">Candidate Voting End</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(results.election.candidateVotingEnd).toLocaleString()}
                        </p>
                        {!results.votingStatus.candidateVotingOpen && (
                          <p className="text-xs text-orange-600">Closed early</p>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Election Type</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {results.election.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {results.election.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Statistics Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{results.statistics.totalVoters}</p>
                      <p className="text-sm text-muted-foreground">Total Voters</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{results.statistics.candidateVotes}</p>
                      <p className="text-sm text-muted-foreground">Candidate Votes</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{results.statistics.initiativeVotes}</p>
                      <p className="text-sm text-muted-foreground">Initiative Votes</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Data Freshness</h3>
                  <p className="text-sm text-muted-foreground">
                    Results last updated: {lastUpdated.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data refreshes automatically when new votes are cast
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
