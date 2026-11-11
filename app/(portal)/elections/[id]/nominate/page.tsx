import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import LegacyNominateForm from '@/components/nominate-form';
import { NominateForm } from '@/components/elections/nominate-form';
import { PageHeader } from '@/components/portal/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Banner } from '@/components/ui/banner';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { currentUserIsActiveMember } from '@/utils/election-config';
import { electionPhase } from '@/utils/elections/rules';
import { formatDeadline } from '@/utils/format';
import { nominate } from '@/utils/elections/nominations';

interface Props {
  params: Promise<{ id: string }>;
}
export default async function NominatePage(props: Props) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return redirect('/signin');

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return redirect('/register');

  const { data: election } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!election) notFound();

  // This election's own positions, not every type's (W8).
  const { data: positions } = await supabase
    .from('ballot_positions')
    .select('id, title, description')
    .eq('election_id', id)
    .order('display_order', { ascending: true });

  if (!(await checkFeatureFlag('enableElectionManagement'))) {
    return (
      <div className="max-w-3xl">
        <BreadcrumbName id={election.id} name={election.title} />
        <LegacyNominateForm
          electionTitle={election.title}
          electionId={election.id}
          userId={user.id}
          positions={(positions ?? []).map((p) => ({
            id: p.id,
            position: p.title,
            description: p.description
          }))}
          member={member}
        />
      </div>
    );
  }

  const phase = electionPhase(election);
  const header = (
    <PageHeader
      back={{ href: `/elections/${id}`, label: election.title }}
      title="Nominate a candidate"
      description={
        phase.nominationsOpen
          ? `Nominations close ${formatDeadline(election.nomination_end!)}. You can nominate yourself or another approved member.`
          : undefined
      }
    />
  );

  // One position per election (B2): someone already standing can still nominate others.
  const [{ data: accepted }, { data: candidacy }] = await Promise.all([
    supabase
      .from('nominations')
      .select('position')
      .eq('election_id', id)
      .eq('nominee_user_id', user.id)
      .in('status', ['submitted', 'approved'])
      .maybeSingle(),
    supabase
      .from('candidates')
      .select('position')
      .eq('election_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
  ]);
  const standingFor = accepted?.position ?? candidacy?.position;

  let body: React.ReactNode;
  if (!phase.nominationsOpen) {
    body = (
      <StatePanel title="Nominations aren’t open">
        {election.nomination_start &&
        Date.now() < Date.parse(election.nomination_start)
          ? `They open ${formatDeadline(election.nomination_start)}.`
          : 'Nominations for this election have closed.'}
      </StatePanel>
    );
  } else if (!(await currentUserIsActiveMember())) {
    body = (
      <StatePanel title="Only approved members can nominate">
        Nominating needs an approved membership with your dues up to date.
      </StatePanel>
    );
  } else {
    const { data: members } = await supabase.rpc('election_nominees', {
      p_election: id
    });
    body = (
      <>
        {standingFor && (
          <Banner
            tone="info"
            title={`You’re already standing for ${standingFor}`}
          >
            You can stand for one position per election, so you can only
            nominate someone else.
          </Banner>
        )}
        <NominateForm
          action={nominate.bind(null, id)}
          canSelf={!standingFor}
          positions={positions ?? []}
          members={(members ?? []).filter((m) => m.user_id !== user.id)}
          myName={member.fullName ?? ''}
        />
      </>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      {header}
      {body}
      <p className="mt-0 text-sm text-muted-foreground">
        <Link
          href="/account/nominations"
          className="underline underline-offset-2"
        >
          My nominations
        </Link>{' '}
        shows the nominations you’ve made and received.
      </p>
    </div>
  );
}
