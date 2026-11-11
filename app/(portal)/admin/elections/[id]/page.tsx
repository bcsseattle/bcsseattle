import Link from 'next/link';
import { PageHeader } from '@/components/portal/page-header';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';
import { Panel } from '@/components/portal/panel';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { buttonVariants } from '@/components/ui/button';
import { TransactionStep, TransactionSteps, type StepState } from '@/components/ui/transaction-step';
import { ActivityList } from '@/components/admin/elections/activity-list';
import { CancelElectionButton, DeleteDraftButton, PublishButton } from '@/components/admin/elections/transition-buttons';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { formatDeadline } from '@/utils/format';
import { separatePeriods, validateTimeline, type ElectionPhase } from '@/utils/elections/rules';
import { cn } from '@/utils/cn';
import { cancelElection, deleteDraft, publishElection } from '../actions';
import { loadAdminElection, requireElectionManagement, type AdminElection } from '../data';

// Later phases add Nominations, Ballot, Voting and Results.
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'settings', label: 'Settings' }
] as const;
type Tab = (typeof TABS)[number]['key'];

// The lifecycle as a timeline: each phase is done, current or upcoming.
const LIFECYCLE: { label: string; phases: ElectionPhase[] }[] = [
  { label: 'Draft', phases: ['draft'] },
  { label: 'Published', phases: ['upcoming'] },
  { label: 'Nominations', phases: ['nominations_open', 'review'] },
  { label: 'Ballot locked', phases: ['ballot_ready'] },
  { label: 'Voting', phases: ['voting_open'] },
  { label: 'Certified', phases: ['voting_closed', 'certified'] },
  { label: 'Results', phases: ['results_published', 'archived'] }
];

// The admin layout already turns away anyone who isn't an admin.
export default async function AdminElectionPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireElectionManagement();
  const { id } = await props.params;
  const { tab: rawTab } = await props.searchParams;
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : 'overview';
  const data = await loadAdminElection(id);
  const { election, phase, next, actions, positions, initiatives } = data;

  const publishSummary = `${positions.length} position${positions.length === 1 ? '' : 's'} and ${initiatives.length} initiative${initiatives.length === 1 ? '' : 's'}. Voting opens ${formatDeadline(election.start_date)}.`;
  // The next action as a button, where this phase's screen exists. Later
  // phases add review, lock, turnout, certify, publish results and archive.
  const primary =
    next?.action === 'publish' ? (
      <PublishButton run={publishElection.bind(null, id)} summary={publishSummary} />
    ) : next?.action === 'finish_setup' ? (
      <Link href={`/admin/elections/${id}/edit?step=review`} className={buttonVariants()}>
        Finish setup
      </Link>
    ) : next?.action === 'preview' ? (
      <Link href={`/elections/${id}`} className={buttonVariants({ variant: 'outline' })}>
        {next.label}
      </Link>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      <PageHeader
        back={{ href: '/admin/elections', label: 'Elections' }}
        badge={<Badge tone={phase.label.tone}>{phase.label.admin}</Badge>}
        title={election.title}
        description={election.description}
        actions={primary}
      />
      <nav aria-label="Election sections" className="flex max-w-full items-end gap-5 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/elections/${id}${t.key === 'overview' ? '' : `?tab=${t.key}`}`}
            aria-current={t.key === tab ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex h-10 shrink-0 items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground',
              t.key === tab && 'border-foreground text-foreground'
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === 'overview' && <Overview data={data} />}
      {tab === 'activity' && <Activity electionId={id} />}
      {tab === 'settings' && (
        <Panel title="Settings" subtitle="Changes here are recorded in the activity log.">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/elections/${id}/edit?step=basics`} className={buttonVariants({ variant: 'outline' })}>
                {election.status === 'draft' ? 'Edit the draft' : 'Edit title and description'}
              </Link>
            </div>
            <div className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-item text-foreground">Stop this election</h3>
              {election.status === 'draft' ? (
                <div>
                  <DeleteDraftButton run={deleteDraft.bind(null, id)} />
                </div>
              ) : actions.cancel === true ? (
                <div>
                  <CancelElectionButton run={cancelElection.bind(null, id)} />
                </div>
              ) : (
                <p className="mt-0 text-sm text-muted-foreground">{actions.cancel}</p>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Overview({ data }: { data: AdminElection }) {
  const { election, phase, actions, positions, initiatives, candidates, ctx } = data;
  const at = LIFECYCLE.findIndex((s) => s.phases.includes(phase.phase));
  const stepState = (i: number): StepState => (i < at ? 'done' : i === at ? 'current' : 'upcoming');
  const separate = separatePeriods(election);
  const notice = election.status === 'draft' ? validateTimeline(election, { hasPositions: positions.length > 0 }).warning : null;
  const date = (iso: string | null | undefined) => (iso ? formatDeadline(iso) : 'Not set');
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-1 px-4 py-3 md:flex-row md:gap-4">
      <dt className="text-sm text-muted-foreground md:w-48 md:shrink-0">{label}</dt>
      <dd className="m-0 text-sm">{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {election.status === 'cancelled' && (
        <Banner tone="attention" title="Cancelled">
          {election.cancel_reason}
        </Banner>
      )}
      {phase.lockOverdue && (
        <Banner tone="error" title="Voting should have started">
          The voting start has passed but the ballot isn’t locked, so members can’t vote. Lock the ballot or move the voting dates.
        </Banner>
      )}
      {election.status === 'draft' && actions.publish !== true && (
        <Banner tone="attention" title="Not ready to publish">
          {actions.publish}
        </Banner>
      )}
      {notice && (
        <Banner tone="attention" title="Short notice">
          {notice}
        </Banner>
      )}
      {ctx.adminIsStanding && (
        <Banner tone="info" title="You’re standing in this election">
          Another admin has to review, lock, extend, cancel, certify and publish it.
        </Banner>
      )}

      {election.status !== 'cancelled' && (
        <Panel title="Where it stands">
          <div className="p-4">
            <TransactionSteps>
              {LIFECYCLE.map((s, i) => (
                <TransactionStep key={s.label} label={s.label} state={stepState(i)} />
              ))}
            </TransactionSteps>
          </div>
        </Panel>
      )}

      <Panel title="Key dates" subtitle="Pacific time. Each window includes its start and end.">
        <dl className="m-0 divide-y">
          {positions.length > 0 && row('Nominations', `${date(election.nomination_start)} to ${date(election.nomination_end)}`)}
          {row(separate ? 'Initiative voting' : 'Voting', `${date(election.start_date)} to ${date(election.end_date)}`)}
          {separate &&
            row(
              'Candidate voting',
              `${date(election.candidate_voting_start ?? election.start_date)} to ${date(election.candidate_voting_end ?? election.end_date)}`
            )}
          {row('Results expected', date(election.results_date))}
          {row('Membership cutoff', election.eligibility_cutoff ? date(election.eligibility_cutoff) : 'When the ballot is locked')}
        </dl>
      </Panel>

      <Panel title="Ballot">
        <dl className="m-0 divide-y">
          {positions.map((p) =>
            row(
              p.title,
              p.vacant
                ? 'Vacant'
                : `${p.seats} seat${p.seats === 1 ? '' : 's'} · ${candidates.filter((c) => c.ballot_position_id === p.id).length} candidate${candidates.filter((c) => c.ballot_position_id === p.id).length === 1 ? '' : 's'}`
            )
          )}
          {initiatives.map((t) => row('Initiative', t.title))}
          {positions.length + initiatives.length === 0 && row('Nothing yet', 'Add positions or initiatives in the setup steps.')}
        </dl>
      </Panel>
    </div>
  );
}

async function Activity({ electionId }: { electionId: string }) {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('election_events')
    .select('*')
    .eq('election_id', electionId)
    .order('id', { ascending: false })
    .limit(200);
  // users is readable only by its owner; the admin layout has checked the
  // caller, so names are read with the service role (names only).
  const actorIds = Array.from(new Set((events ?? []).map((e) => e.actor_id).filter(Boolean))) as string[];
  const { data: users } = actorIds.length
    ? await supabaseAdmin.from('users').select('id, full_name').in('id', actorIds)
    : { data: [] };
  const names = new Map((users ?? []).map((u) => [u.id, u.full_name ?? 'An admin']));
  return (
    <Panel title="Activity" subtitle="Every change to this election, its ballot and nominations, newest first. It can’t be edited.">
      <ActivityList events={events ?? []} names={names} />
    </Panel>
  );
}
