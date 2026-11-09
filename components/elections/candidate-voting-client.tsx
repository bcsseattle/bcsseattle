'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { CandidateVotingFormSchema } from '@/components/elections/candidate-voting-form';
import CandidateVotingForm from '@/components/elections/candidate-voting-form';
import { Candidate, Election } from '@/types';

interface CandidateVotingClientProps {
  election: Election;
  candidates: Candidate[];
  positionOrder: Array<{
    position: string;
    description?: string | null;
    display_order: number;
  }>;
  hasVoted: boolean;
  userId: string;
}

export default function CandidateVotingClient({
  election,
  candidates,
  positionOrder,
  hasVoted,
  userId
}: CandidateVotingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: z.infer<typeof CandidateVotingFormSchema>) => {
    setIsSubmitting(true);

    try {
      // Transform form values to API format
      const candidateVotes = Object.entries(values.candidateVotes)
        .filter(([_, candidateId]) => candidateId) // Only include selected candidates
        .map(([position, candidateId]) => {
          const candidate = candidates.find(c => c.id === candidateId);
          return {
            candidateId: candidateId!,
            position: candidate?.position || position
          };
        });

      const response = await fetch(`/api/elections/${election.id}/vote/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateVotes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit votes');
      }

      // Show success message
      toast.success('Candidate votes submitted successfully!', {
        description: `Confirmation code: ${data.confirmationCode}`,
      });

      // Redirect to confirmation page
      router.push(`/elections/${election.id}/vote/candidates/confirmation?code=${data.confirmationCode}`);
    } catch (error) {
      console.error('Error submitting candidate votes:', error);
      toast.error('Failed to submit votes', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CandidateVotingForm
      election={election}
      candidates={candidates}
      positionOrder={positionOrder}
      hasVoted={hasVoted}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
