'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Candidate, Election } from '@/types';
import { 
  Vote, 
  AlertTriangle, 
  CheckCircle, 
  Users,
  User,
} from 'lucide-react';

// Candidate Voting Form Schema
export const CandidateVotingFormSchema = z.object({
  candidateVotes: z.record(z.string(), z.string().optional())
});

interface CandidateVotingFormProps {
  election: Election;
  candidates: Candidate[];
  positionOrder: Array<{
    position: string;
    description?: string | null;
    display_order: number;
  }>;
  hasVoted: boolean;
  onSubmit: (values: z.infer<typeof CandidateVotingFormSchema>) => Promise<void>;
  isSubmitting: boolean;
}

export default function CandidateVotingForm({
  election,
  candidates,
  positionOrder,
  hasVoted,
  onSubmit,
  isSubmitting
}: CandidateVotingFormProps) {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);

  const form = useForm<z.infer<typeof CandidateVotingFormSchema>>({
    resolver: zodResolver(CandidateVotingFormSchema),
    defaultValues: {
      candidateVotes: {}
    }
  });

  // Group candidates by position
  const candidatesByPosition = candidates.reduce((acc, candidate) => {
    if (!acc[candidate.position]) {
      acc[candidate.position] = [];
    }
    acc[candidate.position].push(candidate);
    return acc;
  }, {} as Record<string, Candidate[]>);

  // Get ordered positions that have candidates
  const orderedPositions = positionOrder.filter(
    (pos) => candidatesByPosition[pos.position]
  );

  // Get candidate's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof CandidateVotingFormSchema>) => {
    if (!showSummary) {
      setShowSummary(true);
      return;
    }
    
    await onSubmit(values);
  };

  // Get vote summary for review
  const getVoteSummary = () => {
    const values = form.getValues();
    const candidateVoteSummary = Object.entries(values.candidateVotes)
      .filter(([_, candidateId]) => candidateId)
      .map(([position, candidateId]) => {
        const candidate = candidates.find(c => c.id === candidateId);
        return { position, candidate };
      });

    return candidateVoteSummary;
  };

  // If user has already voted, show message
  if (hasVoted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Candidate Votes Already Submitted
          </CardTitle>
          <CardDescription className="text-green-700">
            You have already cast your votes for candidates in this election. Thank you for participating!
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/elections/${election.id}`)}
          >
            Back to Election Details
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Election Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Vote for Candidates: {election.title}
          </CardTitle>
          <CardDescription>
            Select your preferred candidates for each position. You may leave positions blank if you choose not to vote for that position.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Voting Instructions */}
      <div className="relative w-full rounded-lg border p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Important:</strong> You can only vote for candidates once in this election. Please review your selections carefully before submitting.
            You may choose one candidate per position, or leave positions blank.
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Candidate Voting Section */}
          {orderedPositions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Choose Your Candidates
                </CardTitle>
                <CardDescription>
                  Select one candidate for each position, or leave blank if you choose not to vote for that position.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {orderedPositions.map((position) => (
                  <div key={position.position} className="space-y-4">
                    {/* Position Header */}
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {position.display_order}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {position.position}
                        </h3>
                        <Badge variant="outline">
                          {candidatesByPosition[position.position].length} candidate
                          {candidatesByPosition[position.position].length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {position.description && (
                        <p className="text-sm text-gray-600 ml-11">
                          {position.description}
                        </p>
                      )}
                    </div>

                    {/* Candidate Selection */}
                    <FormField
                      control={form.control}
                      name={`candidateVotes.${position.position}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="space-y-3"
                            >
                              {/* No vote option */}
                              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                                <RadioGroupItem value="" id={`no-vote-${position.position}`} />
                                <label 
                                  htmlFor={`no-vote-${position.position}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                      <User className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-600">No Vote</p>
                                      <p className="text-sm text-gray-500">Skip this position</p>
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* Candidate options */}
                              {candidatesByPosition[position.position].map((candidate) => (
                                <div 
                                  key={candidate.id} 
                                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                                >
                                  <RadioGroupItem value={candidate.id} id={candidate.id} />
                                  <label 
                                    htmlFor={candidate.id}
                                    className="flex-1 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-4">
                                      <Avatar className="h-12 w-12">
                                        <AvatarImage 
                                          src={candidate.photo_url || ''} 
                                          alt={candidate.full_name}
                                        />
                                        <AvatarFallback>
                                          {getInitials(candidate.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-1">
                                          {candidate.full_name}
                                        </h4>
                                        {candidate.bio && (
                                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                            {candidate.bio}
                                          </p>
                                        )}
                                        <Badge variant="secondary" className="text-xs">
                                          {candidate.position}
                                        </Badge>
                                      </div>
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vote Summary (shown before final submission) */}
          {showSummary && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-5 h-5" />
                  Review Your Candidate Votes
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Please review your candidate selections before submitting. Once submitted, you cannot change your votes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getVoteSummary().length > 0 ? (
                  getVoteSummary().map(({ position, candidate }, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-b-0">
                      <span className="font-medium text-yellow-800">{position}</span>
                      <span className="text-yellow-700">{candidate?.full_name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-yellow-700">
                    No candidates selected
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-between items-center">
            {showSummary && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSummary(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[150px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : showSummary ? (
                <>
                  <Vote className="w-4 h-4 mr-2" />
                  Submit Candidate Votes
                </>
              ) : (
                'Review Votes'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
