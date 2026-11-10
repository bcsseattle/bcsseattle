import { FormPageSkeleton } from '@/components/ui/page-skeletons';

export default function Loading() {
  return <FormPageSkeleton fields={3} className="flex max-w-2xl flex-col gap-6 pb-8 pt-8 lg:pt-16" />;
}
