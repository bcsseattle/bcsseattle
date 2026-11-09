'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  FormDescription
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
  Clock, 
  Users,
  User,
  FileText
} from 'lucide-react';

// Voting Form Schema
export const VotingFormSchema = z.object({
  candidateVotes: z.record(z.string(), z.string().optional()),
  initiativeVotes: z.record(z.string(), z.enum(['yes', 'no', 'abstain']).optional())
});

interface VotingFormProps {
  election: Election;
  candidates: Candidate[];
  initiatives: any[];
  positionOrder: Array<{
    position: string;
    description?: string | null;
    display_order: number;
  }>;
  hasVoted: boolean;
  onSubmit: (values: z.infer<typeof VotingFormSchema>) => Promise<void>;
  isSubmitting: boolean;
}

export default function VotingForm({
  election,
  candidates,
  initiatives,
  positionOrder,
  hasVoted,
  onSubmit,
  isSubmitting
}: VotingFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showSummary, setShowSummary] = useState(false);

  const form = useForm<z.infer<typeof VotingFormSchema>>({
    resolver: zodResolver(VotingFormSchema),
    defaultValues: {
      candidateVotes: {},
      initiativeVotes: {}
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
  const handleSubmit = async (values: z.infer<typeof VotingFormSchema>) => {
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

    const initiativeVoteSummary = Object.entries(values.initiativeVotes)
      .filter(([_, vote]) => vote)
      .map(([initiativeId, vote]) => {
        const initiative = initiatives.find(i => i.id === initiativeId);
        return { initiative, vote };
      });

    return { candidateVoteSummary, initiativeVoteSummary };
  };

  // If user has already voted, show message
  if (hasVoted) {
    return (
      <Card className="border-badge-green-border bg-badge-green-bg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-badge-green-text">
            <CheckCircle className="w-5 h-5" />
            Vote Already Submitted
          </CardTitle>
          <CardDescription className="text-badge-green-text">
            You have already cast your vote in this election. Thank you for participating!
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
    <div className="max-w-4xl space-y-6">
      {/* Election Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-6 h-6" />
            Cast Your Vote: {election.title}
          </CardTitle>
          <CardDescription>
            {election.description}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Voting Instructions */}
      <div className="relative w-full rounded-lg border p-4 bg-accent-100 border-accent-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-accent mt-0.5" />
          <div className="text-sm text-foreground">
            <strong>Important:</strong> You can only vote once in this election. Please review your selections carefully before submitting.
            {election.type === 'leadership' && ' You may choose one candidate per position, or leave positions blank.'}
            {initiatives.length > 0 && ' For initiatives, you can vote Yes, No, or Abstain on each measure.'}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Candidate Voting Section */}
          {election.type === 'leadership' && orderedPositions.length > 0 && (
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
                    <div className="border-b border-border pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground font-semibold text-sm">
                            {position.display_order}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {position.position}
                        </h3>
                        <Badge variant="outline">
                          {candidatesByPosition[position.position].length} candidate
                          {candidatesByPosition[position.position].length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {position.description && (
                        <p className="text-sm text-muted-foreground ml-11">
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
                              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted">
                                <RadioGroupItem value="" id={`no-vote-${position.position}`} />
                                <label 
                                  htmlFor={`no-vote-${position.position}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-mat rounded-full flex items-center justify-center">
                                      <User className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground">No Vote</p>
                                      <p className="text-sm text-muted-foreground">Skip this position</p>
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* Candidate options */}
                              {candidatesByPosition[position.position].map((candidate) => (
                                <div 
                                  key={candidate.id} 
                                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted"
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
                                        <AvatarFallback className="">
                                          {getInitials(candidate.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <p className="font-medium text-foreground">
                                          {candidate.full_name}
                                        </p>
                                        {candidate.bio && (
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {candidate.bio}
                                          </p>
                                        )}
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

          {/* Initiative Voting Section */}
          {initiatives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Ballot Initiatives
                </CardTitle>
                <CardDescription>
                  Vote Yes, No, or Abstain on each ballot measure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {initiatives.map((initiative, index) => (
                  <div key={initiative.id} className="space-y-4">
                    {/* Initiative Header */}
                    <div className="pl-4 py-2">
                      <h4 className="font-semibold text-lg text-foreground mb-2">
                        Initiative {index + 1}: {initiative.title}
                      </h4>
                      {initiative.description && (
                        <p className="text-muted-foreground mb-3">{initiative.description}</p>
                      )}
                      {initiative.additional_info_url && (
                        <a 
                          href={initiative.additional_info_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-foreground text-sm underline"
                        >
                          Learn more about this initiative →
                        </a>
                      )}
                    </div>

                    {/* Initiative Voting Options */}
                    <FormField
                      control={form.control}
                      name={`initiativeVotes.${initiative.id}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3"
                            >
                              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-badge-green-bg">
                                <RadioGroupItem value="yes" id={`${initiative.id}-yes`} />
                                <label 
                                  htmlFor={`${initiative.id}-yes`}
                                  className="flex-1 cursor-pointer text-center"
                                >
                                  <div className="text-badge-green-text">
                                    <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                                    <p className="font-medium">Yes</p>
                                    <p className="text-xs text-badge-green-text">Support this initiative</p>
                                  </div>
                                </label>
                              </div>

                              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-badge-red-bg">
                                <RadioGroupItem value="no" id={`${initiative.id}-no`} />
                                <label 
                                  htmlFor={`${initiative.id}-no`}
                                  className="flex-1 cursor-pointer text-center"
                                >
                                  <div className="text-badge-red-text">
                                    <AlertTriangle className="w-6 h-6 mx-auto mb-1" />
                                    <p className="font-medium">No</p>
                                    <p className="text-xs text-badge-red-text">Oppose this initiative</p>
                                  </div>
                                </label>
                              </div>

                              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted">
                                <RadioGroupItem value="abstain" id={`${initiative.id}-abstain`} />
                                <label 
                                  htmlFor={`${initiative.id}-abstain`}
                                  className="flex-1 cursor-pointer text-center"
                                >
                                  <div className="text-foreground">
                                    <Clock className="w-6 h-6 mx-auto mb-1" />
                                    <p className="font-medium">Abstain</p>
                                    <p className="text-xs text-muted-foreground">No position</p>
                                  </div>
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {index < initiatives.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vote Summary (shown before final submission) */}
          {showSummary && (
            <Card className="border-badge-orange-border bg-badge-orange-bg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-badge-orange-text">
                  <AlertTriangle className="w-5 h-5" />
                  Review Your Votes
                </CardTitle>
                <CardDescription className="text-badge-orange-text">
                  Please review your selections before submitting. Once submitted, you cannot change your votes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const { candidateVoteSummary, initiativeVoteSummary } = getVoteSummary();
                  
                  return (
                    <>
                      {/* Candidate Vote Summary */}
                      {candidateVoteSummary.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-badge-orange-text mb-2">Candidate Votes:</h4>
                          <div className="space-y-2">
                            {candidateVoteSummary.map(({ position, candidate }) => (
                              <div key={position} className="flex justify-between items-center py-2">
                                <span className="font-medium">{position}:</span>
                                <span>{candidate?.full_name || 'No candidate selected'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Initiative Vote Summary */}
                      {initiativeVoteSummary.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-badge-orange-text mb-2">Initiative Votes:</h4>
                          <div className="space-y-2">
                            {initiativeVoteSummary.map(({ initiative, vote }) => (
                              <div key={initiative.id} className="flex justify-between items-center py-2">
                                <span className="font-medium">{initiative.title}:</span>
                                <Badge variant={vote === 'yes' ? 'default' : vote === 'no' ? 'destructive' : 'secondary'}>
                                  {vote === 'yes' ? 'Yes' : vote === 'no' ? 'No' : 'Abstain'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {candidateVoteSummary.length === 0 && initiativeVoteSummary.length === 0 && (
                        <p className="text-badge-orange-text italic">
                          You have not selected any votes. Your ballot will be submitted blank.
                        </p>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Form Actions */}
          <Card>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (showSummary) {
                    setShowSummary(false);
                  } else {
                    router.push(`/elections/${election.id}`);
                  }
                }}
                disabled={isSubmitting}
              >
                {showSummary ? 'Back to Voting' : 'Cancel'}
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-t-transparent border-card rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : showSummary ? (
                  'Submit Vote'
                ) : (
                  'Review & Submit'
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
