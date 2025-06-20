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
  FormMessage
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Election, Initiative } from '@/types';
import {
  Vote,
  AlertTriangle,
  CheckCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';

// Initiative Voting Form Schema
export const InitiativeVotingFormSchema = z.object({
  initiativeVotes: z.record(
    z.string(),
    z.enum(['yes', 'no', 'abstain']).optional()
  )
});

interface InitiativeVotingFormProps {
  election: Election;
  initiatives: Initiative[];
  hasVoted: boolean;
  onSubmit: (
    values: z.infer<typeof InitiativeVotingFormSchema>
  ) => Promise<void>;
  isSubmitting: boolean;
}

export default function InitiativeVotingForm({
  election,
  initiatives,
  hasVoted,
  onSubmit,
  isSubmitting
}: InitiativeVotingFormProps) {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);

  const form = useForm<z.infer<typeof InitiativeVotingFormSchema>>({
    resolver: zodResolver(InitiativeVotingFormSchema),
    defaultValues: {
      initiativeVotes: {}
    }
  });

  // Sort initiatives by ballot order
  const sortedInitiatives = [...initiatives].sort(
    (a, b) => (a.ballot_order || 0) - (b.ballot_order || 0)
  );

  // Handle form submission
  const handleSubmit = async (
    values: z.infer<typeof InitiativeVotingFormSchema>
  ) => {
    if (!showSummary) {
      setShowSummary(true);
      return;
    }

    await onSubmit(values);
  };

  // Get vote summary for review
  const getVoteSummary = () => {
    const values = form.getValues();
    const initiativeVoteSummary = Object.entries(values.initiativeVotes)
      .filter(([_, vote]) => vote)
      .map(([initiativeId, vote]) => {
        const initiative = initiatives.find((i) => i.id === initiativeId);
        return { initiative, vote };
      });

    return initiativeVoteSummary;
  };

  // Get vote icon based on vote value
  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case 'yes':
        return <ThumbsUp className="w-4 h-4" />;
      case 'no':
        return <ThumbsDown className="w-4 h-4" />;
      case 'abstain':
        return <Minus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get vote badge variant
  const getVoteBadgeVariant = (vote: string) => {
    switch (vote) {
      case 'yes':
        return 'default';
      case 'no':
        return 'destructive';
      case 'abstain':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // If user has already voted, show message
  if (hasVoted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Initiative Votes Already Submitted
          </CardTitle>
          <CardDescription className="text-green-700">
            You have already cast your votes for initiatives in this election.
            Thank you for participating!
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
            <FileText className="w-6 h-6" />
            Vote on Initiatives: {election.title}
          </CardTitle>
          <CardDescription>
            Review each ballot measure and vote Yes, No, or Abstain. You may
            skip initiatives if you choose not to vote on them.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Voting Instructions */}
      <div className="relative w-full rounded-lg border p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Important:</strong> You can only vote on initiatives once in
            this election. Please review your selections carefully before
            submitting. For each initiative, you can vote Yes, No, or Abstain.
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Initiative Voting Section */}
          {sortedInitiatives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Ballot Initiatives
                </CardTitle>
                <CardDescription>
                  Vote Yes, No, or Abstain on each ballot measure, or skip if
                  you choose not to vote.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {sortedInitiatives.map((initiative, index) => (
                  <div key={initiative.id} className="space-y-4">
                    {/* Initiative Header */}
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold text-lg text-gray-900 mb-2">
                        Initiative {index + 1}: {initiative.title}
                      </h4>
                      {initiative.description && (
                        <p className="text-gray-600 mb-3">
                          {initiative.description}
                        </p>
                      )}
                      {initiative.additional_info_url && (
                        <a
                          href={initiative.additional_info_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
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
                              className="grid grid-cols-1 md:grid-cols-4 gap-3"
                            >
                              {/* Skip option */}
                              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                                <RadioGroupItem
                                  value=""
                                  id={`skip-${initiative.id}`}
                                />
                                <label
                                  htmlFor={`skip-${initiative.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-600">
                                      Skip
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      No vote
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* Yes option */}
                              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50 border-green-200">
                                <RadioGroupItem
                                  value="yes"
                                  id={`yes-${initiative.id}`}
                                />
                                <label
                                  htmlFor={`yes-${initiative.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-green-700">
                                      <ThumbsUp className="w-4 h-4" />
                                      Yes
                                    </div>
                                    <div className="text-xs text-green-600">
                                      Support
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* No option */}
                              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-red-50 border-red-200">
                                <RadioGroupItem
                                  value="no"
                                  id={`no-${initiative.id}`}
                                />
                                <label
                                  htmlFor={`no-${initiative.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-red-700">
                                      <ThumbsDown className="w-4 h-4" />
                                      No
                                    </div>
                                    <div className="text-xs text-red-600">
                                      Oppose
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* Abstain option */}
                              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                                <RadioGroupItem
                                  value="abstain"
                                  id={`abstain-${initiative.id}`}
                                />
                                <label
                                  htmlFor={`abstain-${initiative.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-700">
                                      <Minus className="w-4 h-4" />
                                      Abstain
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      No preference
                                    </div>
                                  </div>
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {index < sortedInitiatives.length - 1 && <Separator />}
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
                  Review Your Initiative Votes
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Please review your initiative votes before submitting. Once
                  submitted, you cannot change your votes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getVoteSummary().length > 0 ? (
                  getVoteSummary().map(({ initiative, vote }, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-b-0"
                    >
                      <span className="font-medium text-yellow-800">
                        {initiative?.title}
                      </span>
                      <Badge
                        variant={getVoteBadgeVariant(vote!)}
                        className="flex items-center gap-1"
                      >
                        {getVoteIcon(vote!)}
                        {vote === 'yes'
                          ? 'Yes'
                          : vote === 'no'
                            ? 'No'
                            : 'Abstain'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-yellow-700">
                    No initiatives voted on
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
                  Submit Initiative Votes
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
