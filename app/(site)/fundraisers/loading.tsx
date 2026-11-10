import { FundraiserCardSkeleton } from '@/components/fundraisers/fundraiser-card-skeleton';
import { Loading, Skeleton } from '@/components/ui/skeleton';

// The fundraisers page (Figma 6:301): overline, heading, lead, category tabs, cards.
export default function FundraisersLoading() {
  return (
    <Loading className="flex flex-col gap-8 pb-8 pt-8 lg:pt-16">
      <div className="flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-3 w-24 bg-mat" />
        <Skeleton className="h-9 w-80 max-w-full bg-mat" />
        <Skeleton className="h-4 w-full bg-mat" />
      </div>
      <div className="flex gap-5 border-b pb-3">
        {[16, 20, 14, 18].map((w) => (
          <Skeleton key={w} className="h-4 bg-mat" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <FundraiserCardSkeleton key={i} />
        ))}
      </div>
    </Loading>
  );
}
