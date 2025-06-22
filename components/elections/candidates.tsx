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
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
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
          <div className="space-y-8">
            {groupCandidatesByPosition(candidates ?? []).map(
              ({ position, positionData, candidates: positionCandidates, isUnopposed }) => (
                <div key={position} className="space-y-4">
                  {/* Enhanced Position Header with Description */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {positionData?.display_order || '?'}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {position}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {positionCandidates.length} candidate
                          {positionCandidates.length !== 1 ? 's' : ''}
                        </Badge>
                        {candidatesElectedUnopposed && isUnopposed && (
                          <Badge variant="default" className="bg-green-600 text-white">
                            <Crown className="w-3 h-3 mr-1" />
                            Unopposed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Position Description */}
                    {positionData?.description && (
                      <div className="ml-11 text-sm text-gray-600 leading-relaxed">
                        {positionData.description}
                      </div>
                    )}
                  </div>

                  {/* Candidates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <CardContent className="p-4">
                              {/* Election Status Badges */}
                              <div className="absolute top-2 right-2 flex flex-col gap-1">
                                {/* Elected badge for winners */}
                                {isWinner && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600 text-white shadow-md"
                                  >
                                    <Crown className="w-3 h-3 mr-1" />
                                    Elected
                                  </Badge>
                                )}
                                {/* Unopposed badge */}
                                {showElected && (
                                  <Badge
                                    variant="default"
                                    className="bg-blue-600 text-white shadow-md"
                                  >
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Unopposed
                                  </Badge>
                                )}
                                {/* Vote count badge */}
                                {hasVoteResults && candidateResult && (
                                  <Badge
                                    variant="outline"
                                    className="bg-white/90 text-gray-700 shadow-sm"
                                  >
                                    {candidateResult.voteCount} vote{candidateResult.voteCount !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-start gap-4">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-lg rounded-full overflow-hidden">
                                  <AvatarImage
                                    src={candidate.photo_url || ''}
                                    alt={candidate.full_name}
                                    className="object-cover w-full h-full rounded-full"
                                  />
                                  <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white w-full h-full flex items-center justify-center rounded-full">
                                    {getInitials(candidate.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {candidate.full_name}
                                    {isWinner && (
                                      <Crown className="w-4 h-4 ml-2 inline text-green-600" />
                                    )}
                                    {showElected && !isWinner && (
                                      <Trophy className="w-4 h-4 ml-2 inline text-blue-600" />
                                    )}
                                  </h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {candidate.position}
                                    </Badge>
                                    {isWinner && (
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-300">
                                        Winner
                                      </Badge>
                                    )}
                                    {showElected && !isWinner && (
                                      <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                                        Unopposed
                                      </Badge>
                                    )}
                                    {hasVoteResults && candidateResult && positionResults.length > 1 && (
                                      <Badge variant="outline" className="text-xs">
                                        #{positionResults.findIndex(r => r.candidateId === candidate.id) + 1}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Candidate ID: {candidate.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>

                              {candidate.bio && (
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                                    {candidate.bio}
                                  </p>
                                </div>
                              )}
                              
                              {/* Results summary */}
                              {hasVoteResults && candidateResult && positionResults.length > 1 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
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

      {/* Additional Election Info */}
      <CardFooter className="bg-gray-50 rounded-b-lg">
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Positions:</span>
            <Badge variant="outline">{positionOrder.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Candidates:</span>
            <Badge variant="outline">{candidates?.length || 0}</Badge>
          </div>
          {candidates && candidates.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Competition Ratio:</span>
              <Badge variant="outline">
                {(candidates.length / positionOrder.length).toFixed(1)}:1
              </Badge>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
