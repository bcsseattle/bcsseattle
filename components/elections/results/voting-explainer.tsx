import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info, Clock, Trophy, Users, Vote } from 'lucide-react';
import { ElectionResults } from '@/hooks/useElectionResults';
import { getElectionTypeDescription, supportsUnopposedCandidates } from '@/utils/election-types';
import { ElectionType } from '@/types';

interface VotingExplainerProps {
  results: ElectionResults;
}

export function VotingExplainer({ results }: VotingExplainerProps) {
  const electionType = results.election.type as ElectionType;
  const typeDescription = getElectionTypeDescription(electionType);
  const supportsUnopposed = supportsUnopposedCandidates(electionType);
  
  if (!results.election.enableSeparateVotingPeriods && !results.votingStatus.candidatesElectedUnopposed) {
    return null; // Don't show if regular election with no special conditions
  }

  // Get type-specific icon
  const getTypeIcon = (type: ElectionType) => {
    switch (type) {
      case 'leadership':
        return Users;
      case 'board':
        return Trophy;
      case 'initiative':
        return Vote;
      default:
        return Info;
    }
  };

  const TypeIcon = getTypeIcon(electionType);

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <TypeIcon className="h-5 w-5" />
          Understanding This {electionType?.charAt(0).toUpperCase() + electionType?.slice(1)} Election
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <p className="text-sm font-medium text-amber-900">
              {typeDescription}
            </p>
            {electionType === 'initiative' && (
              <p className="text-sm text-amber-800">
                Initiative elections focus on community ballot measures and policy decisions.
              </p>
            )}
            {electionType === 'leadership' && (
              <p className="text-sm text-amber-800">
                Leadership elections may use separate voting periods to accommodate unopposed candidates.
              </p>
            )}
            {electionType === 'board' && (
              <p className="text-sm text-amber-800">
                Board elections determine governance positions and may close early for unopposed candidates.
              </p>
            )}
          </div>
        </div>

        {results.election.enableSeparateVotingPeriods && (
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-900">
                Separate voting periods enabled
              </p>
              <p className="text-sm text-indigo-800">
                {supportsUnopposed 
                  ? "Candidate voting and initiative voting have different time frames to allow for unopposed elections."
                  : "Different components of this election may have separate voting schedules."
                }
              </p>
            </div>
          </div>
        )}

        {results.votingStatus.candidatesElectedUnopposed && supportsUnopposed && (
          <div className="flex items-start gap-3">
            <Trophy className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Candidates elected unopposed
              </p>
              <p className="text-sm text-blue-800">
                When only one candidate runs for each position, they are automatically elected without requiring votes.
                This allows the community to focus on other ballot items.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-white border border-amber-200 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-amber-900">Current Status:</p>
              <div className="flex gap-2 mt-1">
                <Badge variant={results.votingStatus.candidateVotingOpen ? 'default' : 'secondary'} className="text-xs">
                  Candidates: {results.votingStatus.candidateVotingOpen ? 'Open' : 'Closed'}
                </Badge>
                <Badge variant={results.votingStatus.initiativeVotingOpen ? 'default' : 'secondary'} className="text-xs">
                  Initiatives: {results.votingStatus.initiativeVotingOpen ? 'Open' : 'Closed'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="font-medium text-amber-900">Election Ends:</p>
              <p className="text-amber-800 mt-1">
                {new Date(results.election.endDate).toLocaleDateString()} at{' '}
                {new Date(results.election.endDate).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
