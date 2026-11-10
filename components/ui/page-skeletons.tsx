import { Loading, Skeleton, SkeletonRows } from '@/components/ui/skeleton';

// Page-shaped loading states, drawn at the size of what replaces them so the
// page doesn't jump. At most one screen of skeletons (Art Gallery SkeletonRow).

/** A public site page: Title/Display heading and a serif lead. */
export function SitePageSkeleton() {
  return (
    <Loading className="flex max-w-3xl flex-col gap-3 pb-8 pt-8 lg:pt-16">
      <Skeleton className="h-9 w-2/3 bg-mat" />
      <Skeleton className="mt-2 h-4 w-full bg-mat" />
      <Skeleton className="h-4 w-full bg-mat" />
      <Skeleton className="h-4 w-4/5 bg-mat" />
    </Loading>
  );
}

/** A Panel's header with rows under it. */
export function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-2 border-b px-4 pb-3 pt-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <SkeletonRows count={rows} />
    </div>
  );
}

/** A portal page: PageHeader, then a panel of rows. */
export function PortalPageSkeleton() {
  return (
    <Loading className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <PanelSkeleton rows={6} />
    </Loading>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-56 bg-mat" />
      <Skeleton className="h-4 w-full max-w-sm bg-mat" />
    </div>
  );
}

/** A form on a card under a PageHeader: label and control per field, then the submit button. */
export function FormPageSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <Loading className={className ?? 'flex max-w-2xl flex-col gap-6'}>
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-5 rounded-lg border bg-card p-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 self-end rounded-md" />
      </div>
    </Loading>
  );
}
