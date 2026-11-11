import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Vote } from 'lucide-react';
import { PageHeader } from '@/components/portal/page-header';
import { Panel } from '@/components/portal/panel';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { WithdrawButton } from '@/components/elections/nomination-forms';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { withdrawNomination } from '@/utils/elections/nominations';
import { NOMINATION_LABEL, type NominationStatus } from '@/utils/elections/rules';
import { formatDate } from '@/utils/format';

const OPEN_BALLOT = ['draft', 'scheduled'];

/** My nominations: the ones made for me (to answer, edit or withdraw) and the ones I made. */
export default async function MyNominationsPage() {
  if (!(await checkFeatureFlag('enableElectionManagement'))) notFound();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: rows } = await supabase
    .from('nominations')
    .select('id, election_id, nominee_user_id, nominated_by, position, status, message, rejection_reason, created_at, elections(title, status)')
    .or(`nominee_user_id.eq.${user.id},nominated_by.eq.${user.id}`)
    .order('created_at', { ascending: false });
  const all = rows ?? [];
  const forMe = all.filter((n) => n.nominee_user_id === user.id);
  const byMe = all.filter((n) => n.nominated_by === user.id && n.nominee_user_id !== user.id);

  // Names of the other people involved; active members can read the directory.
  const others = Array.from(new Set([...forMe.map((n) => n.nominated_by), ...byMe.map((n) => n.nominee_user_id)].filter(Boolean))) as string[];
  const { data: people } = others.length
    ? await supabase.from('members').select('user_id, fullName').in('user_id', others)
    : { data: [] };
  const name = (id: string | null) => people?.find((p) => p.user_id === id)?.fullName ?? 'A member';

  const card = (n: (typeof all)[number], mine: boolean) => {
    const status = NOMINATION_LABEL[n.status as NominationStatus];
    const open = OPEN_BALLOT.includes(n.elections?.status ?? '');
    const page = `/elections/${n.election_id}/nominations/${n.id}`;
    return (
      <li key={n.id} className="flex flex-col gap-2 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <Link href={page} className="font-medium text-foreground underline-offset-2 hover:underline">
              {n.position}
            </Link>
            <span className="text-caption text-muted-foreground">
              {n.elections?.title} · {mine ? (n.nominated_by === user.id ? 'You nominated yourself' : `Nominated by ${name(n.nominated_by)}`) : `You nominated ${name(n.nominee_user_id)}`} ·{' '}
              {formatDate(n.created_at!)}
            </span>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        {n.status === 'rejected' && n.rejection_reason && <p className="mt-0 text-sm">Reason: {n.rejection_reason}</p>}
        {open && (
          <div className="flex flex-wrap gap-2">
            {mine && n.status === 'awaiting_acceptance' && (
              <Link href={page} className={buttonVariants({ size: 'sm' })}>
                Accept or decline
              </Link>
            )}
            {mine && ['submitted', 'approved'].includes(n.status) && (
              <Link href={page} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Edit details
              </Link>
            )}
            {(mine ? ['awaiting_acceptance', 'submitted', 'approved'] : ['awaiting_acceptance']).includes(n.status) && (
              <WithdrawButton run={withdrawNomination.bind(null, n.id)} approved={n.status === 'approved'} mine={mine} />
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="My nominations"
        description="Nominations made for you and by you. You can change or withdraw them until the ballot is locked."
      />
      {all.length === 0 ? (
        <StatePanel icon={Vote} title="No nominations yet">
          When an election takes nominations, nominate from its page.{' '}
          <Link href="/elections" className="underline underline-offset-2">
            See elections
          </Link>
        </StatePanel>
      ) : (
        <>
          <Panel title="For you">
            {forMe.length ? <ul className="divide-y">{forMe.map((n) => card(n, true))}</ul> : <p className="mt-0 p-4 text-sm text-muted-foreground">Nobody has nominated you.</p>}
          </Panel>
          <Panel title="By you">
            {byMe.length ? <ul className="divide-y">{byMe.map((n) => card(n, false))}</ul> : <p className="mt-0 p-4 text-sm text-muted-foreground">You haven’t nominated anyone else.</p>}
          </Panel>
        </>
      )}
    </div>
  );
}
