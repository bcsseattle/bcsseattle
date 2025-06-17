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
import { Candidate, Election, ElectionPosition } from '@/types';
import { Users } from 'lucide-react';

interface Props {
  candidates: Candidate[] | null;
  election: Election;
  positionOrder: string[];
  isNominationOpen: boolean | '' | null;
}

export default async function Candidates({
  candidates,
  election,
  positionOrder,
  isNominationOpen
}: Props) {
  
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

    // Use dynamic position order
    const sortedPositions = positionOrder.filter(
      (position) => groupedCandidates[position]
    );

    // Add any positions not in the predefined order
    const otherPositions = Object.keys(groupedCandidates).filter(
      (position) => !positionOrder.includes(position)
    );

    return [...sortedPositions, ...otherPositions].map((position) => ({
      position,
      candidates: groupedCandidates[position]
    }));
  }

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
            : `${candidates?.length} candidate${candidates?.length !== 1 ? 's' : ''} running for office`}
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
              ({ position, candidates: positionCandidates }) => (
                <div key={position} className="space-y-4">
                  {/* Position Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {position}
                      </h3>
                      <span className="text-sm text-gray-500">
                        #{positionOrder.indexOf(position) + 1 || '?'}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {positionCandidates.length} candidate
                      {positionCandidates.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Candidates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {positionCandidates.map((candidate) => (
                      <Link
                        href={`/elections/${election.id}/candidate/${candidate.id}`}
                      >
                        <Card
                          key={candidate.id}
                          className="hover:shadow-md transition-shadow border-l-4 border-l-blue-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {candidate.photo_url ? (
                                <Image
                                  src={candidate.photo_url}
                                  alt={candidate.full_name}
                                  width={64}
                                  height={64}
                                  className="rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-gray-200">
                                  {candidate.full_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {candidate.full_name}
                                </h4>
                                <Badge variant="secondary" className="text-xs">
                                  {candidate.position}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                  Candidate ID: {candidate.id.slice(0, 8)}
                                  ...
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
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
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
