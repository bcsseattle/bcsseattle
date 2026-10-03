'use client';

import { FundraiserCard } from './fundraiser-card';

import { Fundraiser } from '@/types/fundraiser';

interface FundraiserListProps {
  fundraisers: Fundraiser[];
}

export function FundraiserList({ fundraisers }: FundraiserListProps) {
  if (!fundraisers?.length) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No fundraisers found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {fundraisers.map((fundraiser) => (
        <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
      ))}
    </div>
  );
}
