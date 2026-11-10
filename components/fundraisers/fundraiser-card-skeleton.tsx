import { Skeleton } from '@/components/ui/skeleton';

/** FundraiserCard's shape while the list loads. */
export function FundraiserCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <Skeleton className="h-[216px] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-2 h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
