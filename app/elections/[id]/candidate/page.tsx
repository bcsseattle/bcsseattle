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
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Link href={`/elections/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Election
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">{election.title}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Leadership</Badge>
          {votingEnded && (
            <Badge variant="secondary">Final Results</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalCandidates}</p>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{totalPositions}</p>
                <p className="text-sm text-muted-foreground">Positions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">
                  {votingEnded ? 'Voting Closed' : 'Voting Open'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Election Status
                </p>
              </div>
            </div>
          </CardContent>
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
        <div className="space-y-8">
          {Object.entries(candidatesByPosition).map(([position, positionCandidates]: [string, CandidateWithResults[]]) => (
            <div key={position} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">{position}</h2>
                <Badge variant="outline">
                  {positionCandidates.length} candidate{positionCandidates.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positionCandidates.map((candidate: CandidateWithResults) => (
                  <Card key={candidate.id} className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={candidate.photo_url || undefined} alt={candidate.full_name} />
                          <AvatarFallback className="text-lg">
                            {candidate.full_name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg">{candidate.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{position}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {votingEnded && (
                              <>
                                {candidate.is_winner && (
                                  <Badge variant="default" className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    Elected
                                  </Badge>
                                )}
                                {candidate.vote_count !== undefined && (
                                  <Badge variant="outline" className="text-xs">
                                    {candidate.vote_count} votes ({candidate.percentage}%)
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
                              <Badge variant="outline">Elected Unopposed</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {candidate.bio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {candidate.bio}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {candidate.manifesto && (
                          <Link href={candidate.manifesto} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Manifesto
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                      
                      {votingEnded && candidate.percentage !== undefined && candidate.percentage > 0 && (
                        <div className="mt-4 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Vote Share</span>
                            <span>{candidate.percentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                candidate.is_winner ? 'bg-green-600' : 'bg-blue-600'
                              }`}
                              style={{ width: `${candidate.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
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
