import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';
import { EditNominationForm, RespondForm, WithdrawButton } from '@/components/elections/nomination-forms';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { respondToNomination, updateNomination, withdrawNomination } from '@/utils/elections/nominations';
import { electionPhase, NOMINATION_LABEL, type NominationStatus } from '@/utils/elections/rules';
import { formatDeadline } from '@/utils/format';

/**
 * One nomination. The nominee accepts or declines it, then edits or withdraws
 * it until the ballot is locked; the nominator sees where it stands. RLS shows
 * a nomination only to the people involved (and admins).
 */
export default async function NominationPage(props: { params: Promise<{ id: string; nominationId: string }> }) {
  if (!(await checkFeatureFlag('enableElectionManagement'))) notFound();
  const { id, nominationId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: n }, { data: election }] = await Promise.all([
    supabase.from('nominations').select('*').eq('id', nominationId).eq('election_id', id).maybeSingle(),
    supabase.from('elections').select('*').eq('id', id).maybeSingle()
  ]);
  if (!n || !election) notFound();

  const mine = n.nominee_user_id === user.id;
  const others = [n.nominated_by, n.nominee_user_id].filter((u) => u && u !== user.id) as string[];
  const [{ data: people }, { data: me }] = await Promise.all([
    others.length ? supabase.from('members').select('user_id, fullName').in('user_id', others) : Promise.resolve({ data: [] }),
    supabase.from('members').select('fullName').eq('user_id', user.id).maybeSingle()
  ]);
  const name = (u: string | null) => (u === user.id ? 'you' : (people?.find((p) => p.user_id === u)?.fullName ?? 'A member'));
  const status = NOMINATION_LABEL[n.status as NominationStatus];
  const phase = electionPhase(election);
  const open = ['draft', 'scheduled'].includes(election.status);
  const defaults = { full_name: n.full_name ?? me?.fullName ?? '', bio: n.bio ?? '', manifesto: n.manifesto ?? '' };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      <PageHeader
        back={{ href: '/account/nominations', label: 'My nominations' }}
        badge={<Badge tone={status.tone}>{status.label}</Badge>}
        title={`${n.position}, ${election.title}`}
        description={
          mine
            ? n.nominated_by === user.id
              ? 'You nominated yourself.'
              : `${name(n.nominated_by)} nominated you.`
            : `You nominated ${name(n.nominee_user_id)}.`
        }
      />

      {n.message && (
        <Banner tone="info" title={`A note from ${mine ? name(n.nominated_by) : 'you'}`}>
          {n.message}
        </Banner>
      )}
      {n.status === 'rejected' && (
        <Banner tone="attention" title="Not approved">
          {n.rejection_reason}
        </Banner>
      )}

      {mine && n.status === 'awaiting_acceptance' && open && (
        <>
          <p className="mt-0 text-sm">
            {phase.nominationsOpen
              ? `To accept, give the details members will see on the ballot. You can accept until ${formatDeadline(election.nomination_end!)}. Accepting declines any other position you’ve been nominated for in this election.`
              : 'Nominations have closed, so you can only decline.'}
          </p>
          <RespondForm action={respondToNomination.bind(null, n.id)} defaults={defaults} />
        </>
      )}

      {mine && ['submitted', 'approved'].includes(n.status) && open && (
        <>
          <p className="mt-0 text-sm">
            {n.status === 'approved'
              ? 'You’re on the ballot. Changes show to members straight away.'
              : 'An admin reviews your nomination after nominations close.'}{' '}
            You can change your details until the ballot is locked.
          </p>
          <EditNominationForm action={updateNomination.bind(null, n.id)} defaults={defaults} photoUrl={n.photo_url} />
        </>
      )}

      {open && (mine ? ['awaiting_acceptance', 'submitted', 'approved'] : ['awaiting_acceptance']).includes(n.status) && (
        <div className="border-t pt-4">
          <WithdrawButton run={withdrawNomination.bind(null, n.id)} approved={n.status === 'approved'} mine={mine} />
        </div>
      )}

      {!open && (
        <p className="mt-0 text-sm text-muted-foreground">The ballot is locked, so this nomination can’t change. Ask an admin if something is wrong.</p>
      )}
    </div>
  );
}
