'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VotingForm from '@/components/elections/voting-form';
import { VotingFormSchema } from '@/types';
import { z } from 'zod';

interface VotingClientProps {
  election: any;
  candidates: any[];
  initiatives: any[];
  positionOrder: Array<{
    position: string;
    description?: string | null;
    display_order: number;
  }>;
  hasVoted: boolean;
  userId: string;
}

export default function VotingClient({
  election,
  candidates,
  initiatives,
  positionOrder,
  hasVoted,
  userId
}: VotingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: z.infer<typeof VotingFormSchema>) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      // Prepare candidate votes
      const candidateVotes = Object.entries(values.candidateVotes)
        .filter(([_, candidateId]) => candidateId && candidateId !== '')
        .map(([position, candidateId]) => ({
          candidateId: candidateId!,
          position
        }));

      // Prepare initiative votes  
      const initiativeVotes = Object.entries(values.initiativeVotes)
        .filter(([_, vote]) => vote && vote !== undefined)
        .map(([initiativeId, vote]) => ({
          initiativeId,
          vote: vote === 'yes' ? true : false // Convert to boolean for the API
        }));

      // Submit votes via API
      const response = await fetch(`/api/elections/${election.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateVotes,
          initiativeVotes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit vote');
      }

      const result = await response.json();
      
      // Redirect to confirmation page
      router.push(`/elections/${election.id}/vote/confirmation`);
      
    } catch (error) {
      console.error('Voting error:', error);
      alert(`Failed to submit vote: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VotingForm
      election={election}
      candidates={candidates}
      initiatives={initiatives}
      positionOrder={positionOrder}
      hasVoted={hasVoted}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
