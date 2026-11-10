import { PanelSkeleton } from '@/components/ui/page-skeletons';
import { Loading, Skeleton } from '@/components/ui/skeleton';

// A fundraiser: title, category and end date, progress, story, Donate, then updates and donors.
export default function FundraiserLoading() {
  return (
    <Loading className="flex flex-col gap-8 pb-8 pt-8 lg:pt-16">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-2/3 bg-mat" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full bg-mat" />
          <Skeleton className="h-4 w-32 bg-mat" />
        </div>
        <Skeleton className="h-2 w-full rounded-full bg-mat" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-36 bg-mat" />
          <Skeleton className="h-4 w-16 bg-mat" />
        </div>
        <div className="flex max-w-3xl flex-col gap-2">
          <Skeleton className="h-4 w-full bg-mat" />
          <Skeleton className="h-4 w-4/5 bg-mat" />
        </div>
        <Skeleton className="mx-auto h-11 w-36 rounded-md bg-mat" />
      </div>
      <PanelSkeleton rows={2} />
      <PanelSkeleton rows={3} />
    </Loading>
  );
}
