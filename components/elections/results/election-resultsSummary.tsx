'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ElectionResultsSummaryProps {
  electionId: string;
  title: string;
  status: string;
  totalVoters: number;
  turnoutPercentage: number;
  topCandidates?: Array<{
    id: string;
    fullName: string;
    position: string;
    voteCount: number;
    percentage: number;
    photoUrl?: string;
  }>;
  className?: string;
}

export function ElectionResultsSummary({
  electionId,
  title,
  status,
  totalVoters,
  turnoutPercentage,
  topCandidates = [],
  className = ""
}: ElectionResultsSummaryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'voting_open':
        return 'bg-green-500';
      case 'voting_closed':
        return 'bg-red-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'voting_open':
        return 'Live';
      case 'voting_closed':
        return 'Closed';
      case 'completed':
        return 'Complete';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>
              {totalVoters} voters • {turnoutPercentage}% turnout
            </CardDescription>
          </div>
          <Badge className={getStatusColor(status)}>
            {getStatusText(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top candidates preview */}
        {topCandidates.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Leading Candidates
            </h4>
            {topCandidates.slice(0, 3).map((candidate) => (
              <div key={candidate.id} className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={candidate.photoUrl} alt={candidate.fullName} />
                  <AvatarFallback className="text-xs">
                    {candidate.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium truncate">{candidate.fullName}</p>
                      <p className="text-xs text-muted-foreground">{candidate.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{candidate.percentage}%</p>
                      <p className="text-xs text-muted-foreground">{candidate.voteCount} votes</p>
                    </div>
                  </div>
                  <Progress value={candidate.percentage} className="h-1 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View full results link */}
        <div className="pt-2 border-t">
          <Link href={`/elections/${electionId}/results`}>
            <Button variant="outline" size="sm" className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Full Results
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickResultsProps {
  electionId: string;
  className?: string;
}

export function QuickResults({ electionId, className = "" }: QuickResultsProps) {
  // This would typically use the same hook as the main results page
  // but with a more lightweight data structure
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Quick Results</CardTitle>
        <CardDescription>Live election snapshot</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            <Link 
              href={`/elections/${electionId}/results`}
              className="text-primary hover:underline"
            >
              View detailed results →
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
