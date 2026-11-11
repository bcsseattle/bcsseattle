import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';
import { ProposalForm, WithdrawProposalButton } from '@/components/elections/proposal-form';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { updateProposal, withdrawProposal } from '@/utils/elections/proposals';
import { NOMINATION_LABEL, type NominationStatus } from '@/utils/elections/rules';

/**
 * One initiative proposal, for the member who made it (RLS shows it only to
 * them and admins). Editable while it waits for review; withdrawable until
 * the ballot is locked.
 */
export default async function ProposalPage(props: { params: Promise<{ id: string; proposalId: string }> }) {
  if (!(await checkFeatureFlag('enableElectionManagement'))) notFound();
  const { id, proposalId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: p }, { data: election }] = await Promise.all([
    supabase.from('initiative_proposals').select('*').eq('id', proposalId).eq('election_id', id).maybeSingle(),
    supabase.from('elections').select('*').eq('id', id).maybeSingle()
  ]);
  if (!p || !election || p.proposed_by !== user.id) notFound();

  const status = NOMINATION_LABEL[p.status as NominationStatus];
  const open = ['draft', 'scheduled'].includes(election.status);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      <PageHeader
        back={{ href: `/elections/${id}`, label: election.title }}
        badge={<Badge tone={status.tone}>{status.label}</Badge>}
        title="Your initiative proposal"
        description={
          p.status === 'submitted'
            ? 'An admin reviews it after nominations close. You can change it until then.'
            : p.status === 'approved'
              ? 'It’s on the ballot. Admins may tidy the wording before the ballot is locked.'
              : undefined
        }
      />
      {p.status === 'rejected' && (
        <Banner tone="attention" title="Not approved">
          {p.rejection_reason}
        </Banner>
      )}

      {open && p.status === 'submitted' ? (
        <ProposalForm
          action={updateProposal.bind(null, id, p.id)}
          defaults={{ title: p.title, description: p.description, url: p.additional_info_url ?? '' }}
          submitLabel={{ idle: 'Save changes', pending: 'Saving…' }}
        />
      ) : (
        <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <h2 className="text-section text-foreground">{p.title}</h2>
          <p className="mt-0 whitespace-pre-line text-sm">{p.description}</p>
          {p.additional_info_url && (
            <a href={p.additional_info_url} className="text-sm underline underline-offset-2" target="_blank" rel="noreferrer">
              More detail
            </a>
          )}
        </section>
      )}

      {open && ['submitted', 'approved'].includes(p.status) && (
        <div className="border-t pt-4">
          <WithdrawProposalButton run={withdrawProposal.bind(null, id, p.id)} approved={p.status === 'approved'} />
        </div>
      )}
    </div>
  );
}
