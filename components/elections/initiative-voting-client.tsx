'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { InitiativeVotingFormSchema } from '@/components/elections/initiative-voting-form';
import InitiativeVotingForm from '@/components/elections/initiative-voting-form';
import { Election, Initiative } from '@/types';

interface InitiativeVotingClientProps {
  election: Election;
  initiatives: Initiative[];
  hasVoted: boolean;
  userId: string;
}

export default function InitiativeVotingClient({
  election,
  initiatives,
  hasVoted,
  userId
}: InitiativeVotingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    values: z.infer<typeof InitiativeVotingFormSchema>
  ) => {
    setIsSubmitting(true);

    try {
      // Transform form values to API format
      const initiativeVotes = Object.entries(values.initiativeVotes)
        .filter(([_, vote]) => vote) // Only include votes that are not empty
        .map(([initiativeId, vote]) => ({
          initiativeId,
          vote: vote as 'yes' | 'no' | 'abstain'
        }));

      const response = await fetch(
        `/api/elections/${election.id}/vote/initiatives`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initiativeVotes
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit votes');
      }

      // Show success message
      toast.success('Initiative votes submitted successfully!', {
        description: `Confirmation code: ${data.confirmationCode}`
      });

      // Redirect to confirmation page
      router.push(
        `/elections/${election.id}/vote/initiatives/confirmation?code=${data.confirmationCode}`
      );
    } catch (error) {
      console.error('Error submitting initiative votes:', error);
      toast.error('Failed to submit votes', {
        description:
          error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InitiativeVotingForm
      election={election}
      initiatives={initiatives}
      hasVoted={hasVoted}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
