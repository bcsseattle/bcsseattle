import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Clock, Trophy, Users, Vote } from 'lucide-react';
import { ElectionResults } from '@/hooks/useElectionResults';
import { getElectionTypeDescription, supportsUnopposedCandidates } from '@/utils/election-types';
import { ElectionType } from '@/types';
import { formatDeadline } from '@/utils/format';

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
    <Card className="border-badge-orange-border bg-badge-orange-bg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-badge-orange-text">
          <TypeIcon className="h-5 w-5" />
          Understanding This {electionType?.charAt(0).toUpperCase() + electionType?.slice(1)} Election
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <p className="text-sm font-medium text-badge-orange-text">
              {typeDescription}
            </p>
            {electionType === 'initiative' && (
              <p className="text-sm text-badge-orange-text">
                Initiative elections focus on community ballot measures and policy decisions.
              </p>
            )}
            {electionType === 'leadership' && (
              <p className="text-sm text-badge-orange-text">
                Leadership elections may use separate voting periods to accommodate unopposed candidates.
              </p>
            )}
            {electionType === 'board' && (
              <p className="text-sm text-badge-orange-text">
                Board elections determine governance positions and may close early for unopposed candidates.
              </p>
            )}
          </div>
        </div>

        {results.election.enableSeparateVotingPeriods && (
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Separate voting periods enabled
              </p>
              <p className="text-sm text-foreground">
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
            <Trophy className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Candidates elected unopposed
              </p>
              <p className="text-sm text-foreground">
                When only one candidate runs for each position, they are automatically elected without requiring votes.
                This allows the community to focus on other ballot items.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-card border border-badge-orange-border rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-badge-orange-text">Current Status:</p>
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
              <p className="font-medium text-badge-orange-text">Election Ends:</p>
              <p className="text-badge-orange-text mt-1">
                {formatDeadline(results.election.endDate)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
