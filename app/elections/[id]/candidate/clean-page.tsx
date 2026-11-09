import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Clock, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Database } from '@/types';

type Election = Database['public']['Tables']['elections']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface CandidateWithResults extends Candidate {
  vote_count?: number;
  percentage?: number;
  is_winner?: boolean;
  ranking?: number;
}

async function getCandidateResults(electionId: string): Promise<CandidateWithResults[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/elections/${electionId}/candidate-results`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching candidate results:', error);
    return [];
  }
}

function isVotingEnded(election: Election): boolean {
  const now = new Date();
  const endDate = new Date(election.end_date);
  
  if (election.candidate_voting_end) {
    const candidateEndDate = new Date(election.candidate_voting_end);
    return now > candidateEndDate;
  }
  
  return now > endDate;
}

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  if (electionError || !election) {
    notFound();
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('*')
    .eq('election_id', id)
    .order('position', { ascending: true })
    .order('full_name', { ascending: true });

  if (candidatesError) {
    console.error('Error fetching candidates:', candidatesError);
  }

  const votingEnded = isVotingEnded(election);
  
  let candidateResults: CandidateWithResults[] = [];
  if (votingEnded) {
    candidateResults = await getCandidateResults(id);
  }

  const candidatesByPosition = (candidates || []).reduce<Record<string, CandidateWithResults[]>>((acc: Record<string, CandidateWithResults[]>, candidate: Candidate) => {
    if (!acc[candidate.position]) {
      acc[candidate.position] = [];
    }
    
    const result = candidateResults.find(r => r.id === candidate.id);
    const candidateWithResults: CandidateWithResults = {
      ...candidate,
      vote_count: result?.vote_count || 0,
      percentage: result?.percentage || 0,
      is_winner: result?.is_winner || false,
      ranking: result?.ranking || 0
    };
    
    acc[candidate.position].push(candidateWithResults);
    return acc;
  }, {});

  Object.keys(candidatesByPosition).forEach(position => {
    candidatesByPosition[position].sort((a: CandidateWithResults, b: CandidateWithResults) => {
      if (votingEnded && a.vote_count !== b.vote_count) {
        return (b.vote_count || 0) - (a.vote_count || 0);
      }
      return a.full_name.localeCompare(b.full_name);
    });
  });

  const totalCandidates = candidates?.length || 0;
  const totalPositions = Object.keys(candidatesByPosition).length;

  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-4 sm:space-y-6 px-4">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Link href={`/elections/${id}`}>
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back
            </Button>
          </Link>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Candidates</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{election.title}</p>
        </div>
        
        {/* Mobile: Stack badges vertically, Desktop: horizontal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2">
          <Badge variant="outline" className="text-xs">Leadership</Badge>
          {votingEnded && (
            <Badge variant="secondary" className="text-xs">Final Results</Badge>
          )}
        </div>
      </div>

      {/* Summary Stats - Mobile Optimized */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-6">
          <div className="text-center">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold">{totalCandidates}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Candidates</p>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-6">
          <div className="text-center">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold">{totalPositions}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Positions</p>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-6">
          <div className="text-center">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium">
              {votingEnded ? 'Closed' : 'Open'}
            </p>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
        </Card>
      </div>

      {totalCandidates === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Candidates Yet</h3>
            <p className="text-muted-foreground">
              Candidates will appear here once they are nominated for this election.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {Object.entries(candidatesByPosition).map(([position, positionCandidates]: [string, CandidateWithResults[]]) => (
            <div key={position} className="space-y-3 sm:space-y-4">
              {/* Position Header - Mobile Optimized */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">{position}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {positionCandidates.length} candidate{positionCandidates.length !== 1 ? 's' : ''}
                    </Badge>
                    {!votingEnded && positionCandidates.length === 1 && (election.show_unopposed_status !== false) && (
                      <Badge variant="secondary" className="text-xs">Unopposed</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Candidate Cards - Mobile: Single column, Tablet: 2 columns, Desktop: 3 columns */}
              <div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-y-0">
                {positionCandidates.map((candidate: CandidateWithResults) => (
                  <Card key={candidate.id} className="overflow-hidden">
                    {/* Mobile: Horizontal layout, Desktop: Vertical layout */}
                    <div className="p-3 sm:p-4">
                      <div className="flex sm:block space-x-3 sm:space-x-0">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 sm:mx-auto flex-shrink-0">
                          <AvatarImage src={candidate.photo_url || undefined} alt={candidate.full_name} />
                          <AvatarFallback className="text-sm sm:text-lg">
                            {candidate.full_name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 sm:mt-3 sm:text-center">
                          {/* Name and Position */}
                          <h3 className="font-semibold text-sm sm:text-base lg:text-lg">{candidate.full_name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground sm:hidden">{position}</p>
                          
                          {/* Status Badges - Compact for mobile */}
                          <div className="flex flex-wrap items-center gap-1 mt-1 sm:mt-2 sm:justify-center">
                            {votingEnded && (
                              <>
                                {candidate.is_winner && (
                                  <Badge variant="default" className="text-xs flex items-center gap-1">
                                    <Trophy className="h-2 w-2 sm:h-3 sm:w-3" />
                                    Elected
                                  </Badge>
                                )}
                                {candidate.vote_count !== undefined && (
                                  <Badge variant="outline" className="text-xs">
                                    {candidate.vote_count} votes
                                  </Badge>
                                )}
                                {candidate.ranking && candidate.ranking > 1 && !candidate.is_winner && (
                                  <Badge variant="secondary" className="text-xs">
                                    #{candidate.ranking}
                                  </Badge>
                                )}
                              </>
                            )}
                            
                            {!votingEnded && 
                             positionCandidates.length === 1 && 
                             (election.show_unopposed_status !== false) && (
                              <Badge variant="outline" className="text-xs sm:hidden">Unopposed</Badge>
                            )}
                          </div>
                          
                          {/* Vote percentage - Mobile: smaller, Desktop: with progress bar */}
                          {votingEnded && candidate.percentage !== undefined && candidate.percentage > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-muted-foreground">Vote Share</span>
                                <span className="font-medium">{candidate.percentage}%</span>
                              </div>
                              <div className="hidden sm:block w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-500 ${
                                    candidate.is_winner ? 'bg-green-600' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${candidate.percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bio - Collapsed on mobile, expanded on desktop */}
                      {candidate.bio && (
                        <div className="mt-3 sm:mt-4">
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                            {candidate.bio}
                          </p>
                        </div>
                      )}
                      
                      {/* Manifesto Button - Compact on mobile */}
                      {candidate.manifesto && (
                        <div className="mt-3 sm:mt-4">
                          <Link href={candidate.manifesto} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                              <FileText className="h-3 w-3 mr-1 sm:mr-2" />
                              <span className="sm:hidden">Manifesto</span>
                              <span className="hidden sm:inline">View Manifesto</span>
                              <ExternalLink className="h-3 w-3 ml-1 sm:ml-2" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
