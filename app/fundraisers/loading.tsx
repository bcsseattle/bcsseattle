import { Skeleton } from '@/components/ui/skeleton';
import { FundraiserCardSkeleton } from '@/components/fundraisers/fundraiser-card-skeleton';

export default function Loading() {
  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <FundraiserCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
