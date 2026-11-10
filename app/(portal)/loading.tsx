import { PortalPageSkeleton } from '@/components/ui/page-skeletons';

// The portal frame stays in place; only the page area waits. Visitors who get
// the site frame on a portal URL see the same shapes, which suit either.
export default function Loading() {
  return <PortalPageSkeleton />;
}
