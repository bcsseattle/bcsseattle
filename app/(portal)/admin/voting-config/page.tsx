/**
 * Test page to verify candidate voting configuration
 * Visit /admin/voting-config to see this page
 */

import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDeadline } from '@/utils/format';
import { getElectionVotingStatus } from '@/utils/election-admin';
import { PageHeader } from '@/components/portal/page-header';

export default async function TestVotingConfigPage() {
  const supabase = await createClient();

  // Get all elections
  const { data: elections, error } = await supabase
    .from('elections')
    .select('id, title, start_date, end_date, candidate_voting_start, candidate_voting_end, enable_separate_voting_periods, show_unopposed_status')
    .order('start_date', { ascending: false });

  if (error) {
    return <div className="text-badge-red-text">Error loading elections: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Voting Configuration Test" />
      
      <div className="text-sm text-muted-foreground mb-4">
        Current time: {formatDeadline(new Date())}
      </div>

      {elections?.map(async (election) => {
        const status = await getElectionVotingStatus(election.id);
        
        return (
          <Card key={election.id} className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{election.title}</span>
                <div className="flex gap-2">
                  {election.enable_separate_voting_periods && (
                    <Badge variant="outline">Separate Periods</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* General Election Period */}
              <div className="border rounded-lg p-4 bg-muted">
                <h4 className="font-semibold mb-2">General Voting Period</h4>
                <div className="text-sm space-y-1">
                  <div>Start: {formatDeadline(election.start_date)}</div>
                  <div>End: {formatDeadline(election.end_date)}</div>
                </div>
              </div>

              {/* Candidate Voting Period */}
              {election.enable_separate_voting_periods && (
                <div className="border rounded-lg p-4 bg-accent-100">
                  <h4 className="font-semibold mb-2">Candidate Voting Period</h4>
                  <div className="text-sm space-y-1">
                    <div>Start: {election.candidate_voting_start ? 
                      formatDeadline(election.candidate_voting_start) : 
                      'Same as general'}</div>
                    <div>End: {election.candidate_voting_end ? 
                      formatDeadline(election.candidate_voting_end) : 
                      'Same as general'}</div>
                  </div>
                </div>
              )}

              {/* Current Status */}
              {status.success && status.data && (
                <div className="border rounded-lg p-4 bg-badge-green-bg">
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Candidate Voting:</span>
                      <Badge variant={status.data.status.candidateVotingOpen ? 'default' : 'secondary'}>
                        {status.data.status.candidateVotingOpen ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Initiative Voting:</span>
                      <Badge variant={status.data.status.initiativeVotingOpen ? 'default' : 'secondary'}>
                        {status.data.status.initiativeVotingOpen ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    {status.data.status.candidatesElectedUnopposed && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Candidates:</span>
                        <Badge variant="outline" className="bg-accent-100 text-foreground">
                          Elected Unopposed
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Configuration */}
              <div className="border rounded-lg p-4 bg-badge-orange-bg">
                <h4 className="font-semibold mb-2">Configuration</h4>
                <div className="text-sm space-y-1">
                  <div>Separate Periods: {election.enable_separate_voting_periods ? 'Enabled' : 'Disabled'}</div>
                  <div>Show Unopposed Status: {election.show_unopposed_status ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {(!elections || elections.length === 0) && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No elections found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
