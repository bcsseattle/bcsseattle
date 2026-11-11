import { PageHeader } from '@/components/portal/page-header';
import { BasicsForm } from '@/components/admin/elections/basics-form';
import { StepNav } from '@/components/admin/elections/steps';
import { createElection } from '../actions';
import { requireElectionManagement } from '../data';

// The admin layout already turns away anyone who isn't an admin.
export default async function NewElectionPage() {
  await requireElectionManagement();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        back={{ href: '/admin/elections', label: 'Elections' }}
        title="New election"
        description="Saving creates a draft that only admins can see. Each step saves as you go."
      />
      <StepNav current="basics" />
      <BasicsForm action={createElection} initial={{ title: '', description: '', type: 'leadership' }} typeLocked={false} isNew />
    </div>
  );
}
