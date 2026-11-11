import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';
import { ProposalForm } from '@/components/elections/proposal-form';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { currentUserIsActiveMember } from '@/utils/election-config';
import { electionPhase } from '@/utils/elections/rules';
import { formatDeadline } from '@/utils/format';
import { proposeInitiative } from '@/utils/elections/proposals';

/** The most proposals one member can have active in an election (B20). */
const LIMIT = 3;

/** Propose an initiative question (plan B17-B20), starting from a sample if you like. */
export default async function ProposePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await checkFeatureFlag('enableElectionManagement'))) notFound();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return redirect(`/signin?redirectTo=${encodeURIComponent(`/elections/${id}/propose`)}`);

  const { data: election } = await supabase.from('elections').select('*').eq('id', id).maybeSingle();
  if (!election) notFound();
  const phase = electionPhase(election);

  const { count } = await supabase
    .from('initiative_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', id)
    .eq('proposed_by', user.id)
    .in('status', ['submitted', 'approved']);
  const used = count ?? 0;

  let body: React.ReactNode;
  if (!phase.nominationsOpen) {
    body = (
      <StatePanel title="Proposals aren’t open">
        {election.nomination_start && Date.now() < Date.parse(election.nomination_start)
          ? `They open ${formatDeadline(election.nomination_start)}.`
          : 'Proposals for this election have closed.'}
      </StatePanel>
    );
  } else if (!(await currentUserIsActiveMember())) {
    body = (
      <StatePanel title="Only approved members can propose initiatives">
        Proposing needs an approved membership with your dues up to date.
      </StatePanel>
    );
  } else if (used >= LIMIT) {
    body = (
      <StatePanel title={`You’ve proposed ${LIMIT} initiatives`}>
        That’s the most for one election. Withdraw one from the election page to propose another.
      </StatePanel>
    );
  } else {
    body = (
      <ProposalForm
        action={proposeInitiative.bind(null, id)}
        samples
        submitLabel={{ idle: 'Propose initiative', pending: 'Sending…' }}
      />
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      <PageHeader
        back={{ href: `/elections/${id}`, label: election.title }}
        title="Propose an initiative"
        description={
          phase.nominationsOpen
            ? `Ask a question for members to vote on. Proposals close ${formatDeadline(election.nomination_end!)}; an admin reviews each one before it goes on the ballot. You can propose up to ${LIMIT}${used ? ` (${used} so far)` : ''}.`
            : undefined
        }
      />
      {body}
    </div>
  );
}
