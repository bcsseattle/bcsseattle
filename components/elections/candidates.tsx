import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Candidate, Election, ElectionPosition, Position } from '@/types';
import { Users, Crown, Trophy, Award } from 'lucide-react';
import { getCandidateResults } from '@/utils/election-config';

interface Props {
  candidates: Candidate[] | null;
  election: Election;
  positionOrder: Position[]; // Array of position objects with description
  isNominationOpen: boolean | '' | null;
  candidatesElectedUnopposed?: boolean; // New prop for election status
  candidateVotingOpen?: boolean; // Whether candidate voting is still open
}

export default async function Candidates({
  candidates,
  election,
  positionOrder,
  isNominationOpen,
  candidatesElectedUnopposed = false,
  candidateVotingOpen = true
}: Props) {
  // Get candidate results if voting is closed
  const candidateResults = !candidateVotingOpen ? await getCandidateResults(election.id) : {};
  function groupCandidatesByPosition(candidates: Candidate[]) {
    const groupedCandidates = candidates.reduce(
      (acc, candidate) => {
        const position = candidate.position;
        if (!acc[position]) {
          acc[position] = [];
        }
        acc[position].push(candidate);
        return acc;
      },
      {} as Record<string, typeof candidates>
    );

    // Use dynamic position order - map position objects to position strings
    const positionNames = positionOrder.map((p) => p.position);
    const sortedPositions = positionNames.filter(
      (position) => groupedCandidates[position]
    );

    // Add any positions not in the predefined order
    const otherPositions = Object.keys(groupedCandidates).filter(
      (position) => !positionNames.includes(position)
    );

    return [...sortedPositions, ...otherPositions].map((positionName) => {
      // Find the position object for additional info
      const positionObj = positionOrder.find(
        (p) => p.position === positionName
      );
      const positionCandidates = groupedCandidates[positionName];
      
      return {
        position: positionName,
        positionData: positionObj,
        candidates: positionCandidates,
        isUnopposed: positionCandidates.length <= 1 // Individual position unopposed status
      };
    });
  }

  // Get candidate's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Candidates
        </CardTitle>
        <CardDescription>
          {candidates?.length === 0
            ? 'No candidates have been nominated yet.'
            : (() => {
                const groups = groupCandidatesByPosition(candidates ?? []);
                const unopposedCount = groups.filter(group => group.isUnopposed && candidatesElectedUnopposed).length;
                const totalPositions = groups.length;
                
                // If voting is closed, show results-based description
                if (!candidateVotingOpen) {
                  const hasResults = Object.keys(candidateResults).length > 0;
                  if (hasResults) {
                    const totalWinners = Object.values(candidateResults).reduce((sum, results) => 
                      sum + (results.length > 0 && results[0].voteCount > 0 ? 1 : 0), 0
                    );
                    return `${candidates?.length} candidate${candidates?.length !== 1 ? 's' : ''} competed - ${totalWinners} elected`;
                  } else {
                    return `${candidates?.length} candidate${candidates?.length !== 1 ? 's' : ''} - voting closed, results pending`;
                  }
                }
                
                // Original logic for active elections
                if (candidatesElectedUnopposed && unopposedCount === totalPositions) {
                  return `${candidates?.length} candidate${candidates?.length !== 1 ? 's' : ''} elected unopposed`;
                } else if (candidatesElectedUnopposed && unopposedCount > 0) {
                  return `${candidates?.length} candidate${candidates?.length !== 1 ? 's' : ''} running for office (${unopposedCount} position${unopposedCount !== 1 ? 's' : ''} unopposed)`;
                } else {
                  return `${candidates?.length} candidate${candidates?.length !== 1 ? 's' : ''} running for office`;
                }
              })()}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {candidates?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No candidates submitted yet.
            </p>
            {isNominationOpen && (
              <p className="text-sm text-gray-500 mt-2">
                Be the first to nominate yourself!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-6">
            {groupCandidatesByPosition(candidates ?? []).map(
              ({ position, positionData, candidates: positionCandidates, isUnopposed }) => (
                <div key={position} className="space-y-2 sm:space-y-3">
                  {/* Mobile-Optimized Position Header */}
                  <div className="border-b border-gray-200 pb-2 sm:pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-0 mb-1 sm:mb-2">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs sm:text-sm">
                            {positionData?.display_order || '?'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-xl font-semibold text-gray-900 leading-tight">
                            {position}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                          {positionCandidates.length} candidate
                          {positionCandidates.length !== 1 ? 's' : ''}
                        </Badge>
                        {candidatesElectedUnopposed && isUnopposed && (
                          <Badge variant="default" className="bg-green-600 text-white text-[10px] sm:text-xs whitespace-nowrap">
                            <Crown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                            Unopposed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Position Description - Hidden on mobile */}
                    {positionData?.description && (
                      <div className="hidden sm:block ml-11 text-sm text-gray-600 leading-relaxed">
                        {positionData.description}
                      </div>
                    )}
                  </div>

                  {/* Candidates Grid - Mobile: Single column, tighter spacing */}
                  <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                    {positionCandidates.map((candidate) => {
                      const showElected = candidatesElectedUnopposed && isUnopposed;
                      
                      // Get vote results for this candidate if voting is closed
                      const positionResults = candidateResults[candidate.position] || [];
                      const candidateResult = positionResults.find(r => r.candidateId === candidate.id);
                      const isWinner = candidateResult && positionResults[0]?.candidateId === candidate.id && candidateResult.voteCount > 0;
                      const hasVoteResults = !candidateVotingOpen && positionResults.length > 0;
                      
                      return (
                        <Link
                          key={candidate.id}
                          href={`/elections/${election.id}/candidate/${candidate.id}`}
                        >
                          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-200 relative">
                            <CardContent className="p-3 sm:p-4">
                              {/* Mobile: Horizontal Layout, Desktop: Vertical centered */}
                              <div className="flex sm:flex-col gap-3 sm:gap-2 items-start sm:items-center">
                                {/* Avatar - Smaller on mobile */}
                                <div className="h-12 w-12 sm:h-20 sm:w-20 border-2 sm:border-4 border-white shadow-lg rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                  {candidate.photo_url ? (
                                    <img
                                      src={candidate.photo_url}
                                      alt={candidate.full_name}
                                      className="object-cover w-full h-full rounded-full"
                                    />
                                  ) : (
                                    <span className="text-sm sm:text-lg font-semibold text-white">
                                      {getInitials(candidate.full_name)}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0 sm:w-full sm:text-center">
                                  {/* Name and Status */}
                                  <div className="space-y-1 sm:space-y-1.5">
                                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">
                                      {candidate.full_name}
                                    </h4>
                                    
                                    {/* Mobile: Show position, Desktop: Hide (already in header) */}
                                    <p className="text-xs text-gray-500 sm:hidden leading-tight">
                                      {candidate.position}
                                    </p>
                                    
                                    {/* Status Badges - Compact for mobile */}
                                    <div className="flex flex-wrap gap-1 sm:justify-center">
                                      {/* Winner badge */}
                                      {isWinner && (
                                        <Badge variant="default" className="text-[10px] sm:text-xs bg-green-600 text-white whitespace-nowrap">
                                          <Crown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                          <span className="sm:hidden">Won</span>
                                          <span className="hidden sm:inline">Elected</span>
                                        </Badge>
                                      )}
                                      
                                      {/* Unopposed badge */}
                                      {showElected && !isWinner && (
                                        <Badge variant="default" className="text-[10px] sm:text-xs bg-blue-600 text-white whitespace-nowrap">
                                          <Trophy className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                          <span className="sm:hidden">Unop.</span>
                                          <span className="hidden sm:inline">Unopposed</span>
                                        </Badge>
                                      )}
                                      
                                      {/* Vote count badge */}
                                      {hasVoteResults && candidateResult && (
                                        <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                                          {candidateResult.voteCount}
                                          <span className="hidden sm:inline">
                                            {' '}vote{candidateResult.voteCount !== 1 ? 's' : ''}
                                          </span>
                                        </Badge>
                                      )}
                                      
                                      {/* Ranking badge */}
                                      {hasVoteResults && candidateResult && positionResults.length > 1 && (
                                        <Badge variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap">
                                          #{positionResults.findIndex(r => r.candidateId === candidate.id) + 1}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Candidate ID - Smaller on mobile */}
                                    <p className="text-[10px] sm:text-xs text-gray-400">
                                      ID: {candidate.id.slice(0, 8)}...
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Bio - Hidden on mobile to reduce clutter */}
                              {candidate.bio && (
                                <div className="hidden sm:block mt-3 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                    {candidate.bio}
                                  </p>
                                </div>
                              )}
                              
                              {/* Results summary - Simplified for mobile */}
                              {hasVoteResults && candidateResult && positionResults.length > 1 && (
                                <div className="hidden sm:block mt-2 pt-2 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                      Rank: #{positionResults.findIndex(r => r.candidateId === candidate.id) + 1} of {positionResults.length}
                                    </span>
                                    <span>
                                      {candidateResult.voteCount} / {positionResults.reduce((sum, r) => sum + r.voteCount, 0)} votes
                                    </span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>

      {/* Mobile-Optimized Election Info */}
      <CardFooter className="bg-gray-50 rounded-b-lg p-3 sm:p-6">
        <div className="w-full">
          {/* Mobile: Horizontal layout, Desktop: Vertical */}
          <div className="grid grid-cols-3 gap-2 sm:space-y-2 sm:grid-cols-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
              <span className="text-gray-600 text-[10px] sm:text-sm leading-tight">Positions:</span>
              <Badge variant="outline" className="text-[10px] sm:text-xs mt-0.5 sm:mt-0 whitespace-nowrap">{positionOrder.length}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
              <span className="text-gray-600 text-[10px] sm:text-sm leading-tight">Candidates:</span>
              <Badge variant="outline" className="text-[10px] sm:text-xs mt-0.5 sm:mt-0 whitespace-nowrap">{candidates?.length || 0}</Badge>
            </div>
            {candidates && candidates.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
                <span className="text-gray-600 text-[10px] sm:text-sm leading-tight">Ratio:</span>
                <Badge variant="outline" className="text-[10px] sm:text-xs mt-0.5 sm:mt-0 whitespace-nowrap">
                  {(candidates.length / positionOrder.length).toFixed(1)}:1
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
