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
import {
  NOMINATION_LABEL,
  positionOnBallot,
  separatePeriods,
  toLocalInput,
  validateTimeline,
  type ElectionPhase,
  type NominationStatus
} from '@/utils/elections/rules';
import { cn } from '@/utils/cn';
import {
  addCandidate,
  approveNomination,
  cancelElection,
  decidePosition,
  deleteDraft,
  editCandidate,
  extendDeadline,
  lockBallot,
  publishElection,
  rejectNomination,
  withdrawCandidate
} from '../actions';
import {
  DecisionButton,
  ExtendForm,
  LockBallotButton,
  WithdrawCandidateButton
} from '@/components/admin/elections/ballot-controls';
import { StatTile } from '@/components/ui/stat-tile';
import { ELECTION_TYPE_CONFIGS } from '@/utils/election-types';
import type { ElectionType } from '@/types';
import { AddCandidateForm, EditCandidate, ReviewButtons } from '@/components/admin/elections/nomination-review';
import { loadAdminElection, requireElectionManagement, type AdminElection } from '../data';

// Phase 5 adds Results.
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'nominations', label: 'Nominations' },
  { key: 'ballot', label: 'Ballot' },
  { key: 'voting', label: 'Voting' },
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
    ) : next?.action === 'lock_ballot' || next?.action === 'turnout' ? (
      <Link href={`/admin/elections/${id}?tab=${next.action === 'lock_ballot' ? 'ballot' : 'voting'}`} className={buttonVariants()}>
        {next.label}
      </Link>
    ) : next?.action === 'review_nominations' ? (
      <Link href={`/admin/elections/${id}?tab=nominations`} className={buttonVariants()}>
        {next.label}
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
        {TABS.filter(
          (t) =>
            (t.key !== 'nominations' || positions.length > 0) && (t.key !== 'voting' || election.status !== 'draft')
        ).map((t) => (
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
      {tab === 'nominations' && <Nominations data={data} />}
      {tab === 'ballot' && <BallotTab data={data} />}
      {tab === 'voting' && <VotingTab data={data} />}
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

/**
 * Nominations by position (plan §5): approve or reject each one the nominee
 * has accepted, see the ones still waiting for an answer, fix a candidate's
 * details and add a candidate directly. Review is open until the ballot is locked.
 */
async function Nominations({ data }: { data: AdminElection }) {
  const { election, positions, ctx } = data;
  const supabase = await createClient();
  const [{ data: nominations }, { data: candidates }, { data: eligible }] = await Promise.all([
    supabase.from('nominations').select('*').eq('election_id', election.id).order('created_at'),
    supabase.from('candidates').select('*').eq('election_id', election.id).order('created_at'),
    supabase.rpc('election_nominees', { p_election: election.id })
  ]);
  const people = Array.from(
    new Set((nominations ?? []).flatMap((n) => [n.nominee_user_id, n.nominated_by]).filter(Boolean))
  ) as string[];
  const { data: members } = people.length
    ? await supabase.from('members').select('user_id, fullName').in('user_id', people)
    : { data: [] };
  const name = (u: string | null) => members?.find((m) => m.user_id === u)?.fullName ?? 'A member';
  const reviewing = election.status === 'scheduled';
  const editable = ['draft', 'scheduled', 'ballot_locked'].includes(election.status);

  return (
    <div className="flex flex-col gap-6">
      {!reviewing && (
        <Banner tone="info" title={election.status === 'draft' ? 'Not published yet' : 'Review is closed'}>
          {election.status === 'draft'
            ? 'Members can nominate once the election is published and nominations open.'
            : 'The ballot is locked. Candidates’ names, statements and photos can still be corrected.'}
        </Banner>
      )}
      {ctx.adminIsStanding && (
        <Banner tone="info" title="You’re standing in this election">
          Another admin has to review its nominations.
        </Banner>
      )}
      {positions.map((p) => {
        const here = (nominations ?? []).filter((n) => n.ballot_position_id === p.id && n.status !== 'approved');
        const onBallot = (candidates ?? []).filter((c) => c.ballot_position_id === p.id);
        const waiting = here.filter((n) => n.status === 'submitted').length;
        return (
          <Panel
            key={p.id}
            title={p.title}
            subtitle={`${p.seats} seat${p.seats === 1 ? '' : 's'} · ${onBallot.length} on the ballot${waiting ? ` · ${waiting} to review` : ''}`}
          >
            <ul className="divide-y">
              {onBallot.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{c.full_name}</span>
                    <Badge tone={c.withdrawn_at ? 'neutral' : 'green'}>{c.withdrawn_at ? 'Withdrawn' : 'On the ballot'}</Badge>
                  </div>
                  {c.bio && <p className="mt-0 line-clamp-2 text-sm text-muted-foreground">{c.bio}</p>}
                  {editable && (
                    <EditCandidate action={editCandidate.bind(null, election.id, c.id)} candidate={c} />
                  )}
                </li>
              ))}
              {here.map((n) => {
                const status = NOMINATION_LABEL[n.status as NominationStatus];
                const who = n.full_name ?? name(n.nominee_user_id);
                return (
                  <li key={n.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{who}</span>
                        <span className="text-caption text-muted-foreground">
                          {n.nominated_by === n.nominee_user_id ? 'Nominated themselves' : `Nominated by ${name(n.nominated_by)}`}
                        </span>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    {n.bio && <p className="mt-0 text-sm">{n.bio}</p>}
                    {n.manifesto && <p className="mt-0 text-sm text-muted-foreground">Platform: {n.manifesto}</p>}
                    {n.status === 'rejected' && n.rejection_reason && <p className="mt-0 text-sm">Reason: {n.rejection_reason}</p>}
                    {reviewing && !ctx.adminIsStanding && ['awaiting_acceptance', 'submitted'].includes(n.status) && (
                      <ReviewButtons
                        approve={approveNomination.bind(null, election.id, n.id)}
                        reject={rejectNomination.bind(null, election.id, n.id)}
                        nominee={who}
                        position={p.title}
                        canApprove={n.status === 'submitted'}
                      />
                    )}
                  </li>
                );
              })}
              {onBallot.length + here.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground">No nominations yet.</li>
              )}
            </ul>
          </Panel>
        );
      })}
      {['draft', 'scheduled'].includes(election.status) && !ctx.adminIsStanding && (
        <Panel title="Add a candidate" subtitle="For a nomination made on paper or at a meeting. It’s recorded in the activity log.">
          <AddCandidateForm
            action={addCandidate.bind(null, election.id)}
            positions={positions.map((p) => ({ id: p.id, title: p.title }))}
            members={eligible ?? []}
          />
        </Panel>
      )}
    </div>
  );
}

/**
 * The ballot (plan §5): each position's candidates and, before the lock, the
 * decisions it needs (vacant, uncontested), extending nominations, what
 * members will vote on, and Lock ballot. After the lock, a candidate can be
 * marked withdrawn (B13).
 */
async function BallotTab({ data }: { data: AdminElection }) {
  const { election, positions, initiatives, candidates, ctx, actions } = data;
  const id = election.id;
  const open = election.status === 'scheduled' || election.status === 'draft';
  const canAct = !ctx.adminIsStanding;
  const electByDefault =
    election.show_unopposed_status ?? ELECTION_TYPE_CONFIGS[(election.type ?? 'leadership') as ElectionType].defaultShowUnopposedStatus;
  const standing = (p: (typeof positions)[number]) => candidates.filter((c) => c.ballot_position_id === p.id);
  // What the lock will record: a missing decision takes the election's default.
  const decided = positions.map((p) => {
    const count = standing(p).length;
    const decision = p.unopposed_decision ?? (count > 0 && count <= p.seats ? (electByDefault ? 'elect' : 'keep_on_ballot') : null);
    return { ...p, count, decision };
  });
  const asPosition = (p: (typeof decided)[number]) => ({
    position: p.title,
    description: p.description,
    display_order: p.display_order,
    seats: p.seats,
    vacant: p.vacant,
    unopposed_decision: p.decision
  });
  const named = candidates.map((c) => ({ position: positions.find((p) => p.id === c.ballot_position_id)?.title ?? '' }));
  const onBallot = decided.filter((p) => positionOnBallot(asPosition(p), named));
  const unopposed = decided.filter((p) => !p.vacant && p.count > 0 && !onBallot.includes(p));
  const vacant = decided.filter((p) => p.vacant);

  let eligible: number | null = null;
  if (open && actions.lock_ballot === true) {
    const { data: roll } = await (await createClient()).rpc('election_nominees', { p_election: id });
    eligible = roll?.length ?? 0;
  }
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const lockSummary = [
    `${plural(onBallot.length, 'position')} and ${plural(initiatives.length, 'initiative')} will be on the ballot.`,
    unopposed.length ? `Elected unopposed: ${unopposed.map((p) => p.title).join(', ')}.` : '',
    vacant.length ? `Vacant: ${vacant.map((p) => p.title).join(', ')}.` : '',
    eligible !== null ? `${plural(eligible, 'member')} will be on the voter roll.` : '',
    `Voting opens ${formatDeadline(election.start_date)}.`
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-6">
      {election.status === 'scheduled' && actions.lock_ballot !== true && (
        <Banner tone="attention" title="Not ready to lock">
          {actions.lock_ballot}
        </Banner>
      )}
      {!open && (
        <Banner tone="info" title="The ballot is locked">
          Positions, candidates and initiatives can’t change. You can fix a typo in a candidate’s details on the Nominations tab, or mark a candidate withdrawn.
        </Banner>
      )}

      <Panel title="Positions" subtitle="Uncontested means no more candidates than seats.">
        <ul className="divide-y">
          {decided.map((p) => {
            const people = standing(p);
            const state = p.vacant ? 'Vacant' : p.count === 0 ? 'No candidates' : p.count <= p.seats ? 'Uncontested' : 'Contested';
            return (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {p.title} <span className="font-normal text-muted-foreground">· {plural(p.seats, 'seat')}</span>
                  </span>
                  <Badge tone={state === 'Contested' ? 'green' : state === 'Uncontested' ? 'blue' : 'orange'}>{state}</Badge>
                </div>
                {people.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {people.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>
                          {c.full_name}
                          {c.withdrawn_at && <span className="text-muted-foreground"> (withdrawn)</span>}
                        </span>
                        {election.status === 'ballot_locked' && !data.phase.votingOver && !c.withdrawn_at && canAct && (
                          <WithdrawCandidateButton run={withdrawCandidate.bind(null, id, c.id)} name={c.full_name} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {state === 'Uncontested' && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {open ? 'On the ballot?' : p.decision === 'elect' ? 'Elected unopposed' : 'Kept on the ballot'}
                    </span>
                    {open && canAct && (
                      <>
                        <DecisionButton pressed={p.decision === 'elect'} run={decidePosition.bind(null, id, p.id, 'elect')}>
                          Elect unopposed
                        </DecisionButton>
                        <DecisionButton pressed={p.decision === 'keep_on_ballot'} run={decidePosition.bind(null, id, p.id, 'keep_on_ballot')}>
                          Keep on the ballot
                        </DecisionButton>
                      </>
                    )}
                  </div>
                )}
                {(state === 'No candidates' || state === 'Vacant') && open && canAct && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {p.vacant ? 'The Board fills it later (Art. VI §4 for officers).' : 'Mark it vacant, or extend nominations below.'}
                    </span>
                    <DecisionButton run={decidePosition.bind(null, id, p.id, p.vacant ? 'not_vacant' : 'vacant')}>
                      {p.vacant ? 'Not vacant' : 'Mark vacant'}
                    </DecisionButton>
                  </div>
                )}
              </li>
            );
          })}
          {positions.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No positions: this election has initiatives only.</li>}
        </ul>
      </Panel>

      {election.status === 'scheduled' && actions.extend_nominations === true && election.nomination_end && (
        <Panel title="Extend nominations" subtitle="For positions with too few candidates. Members can nominate until the new time.">
          <div className="p-4">
            <ExtendForm
              action={extendDeadline.bind(null, id, 'nomination_end')}
              label="Nominations close"
              current={toLocalInput(election.nomination_end)}
              idPrefix="extend-nominations"
            />
          </div>
        </Panel>
      )}

      <Panel title="What members will vote on" subtitle={open ? 'As the ballot stands now.' : undefined}>
        <ul className="divide-y">
          {onBallot.map((p) => (
            <li key={p.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <span className="font-medium">
                {p.title}
                {p.seats > 1 && <span className="font-normal text-muted-foreground"> · choose up to {p.seats}</span>}
              </span>
              <span className="text-muted-foreground">{standing(p).map((c) => c.full_name + (c.withdrawn_at ? ' (withdrawn)' : '')).join(', ')}</span>
            </li>
          ))}
          {initiatives.map((t) => (
            <li key={t.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <span className="font-medium">{t.title}</span>
              <span className="text-muted-foreground">
                Yes / No / Abstain · {t.pass_threshold === 'two_thirds' ? 'passes with two-thirds of Yes and No' : 'passes with more Yes than No'}
              </span>
            </li>
          ))}
          {onBallot.length + initiatives.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">Nothing yet.</li>
          )}
        </ul>
      </Panel>

      {election.status === 'scheduled' && actions.lock_ballot === true && (
        <div>
          <LockBallotButton run={lockBallot.bind(null, id)} summary={lockSummary} />
        </div>
      )}
    </div>
  );
}

/** Turnout (counts only, never who voted for what) and extending voting. */
async function VotingTab({ data }: { data: AdminElection }) {
  const { election, actions, phase } = data;
  const id = election.id;
  if (election.status === 'scheduled') {
    return (
      <Banner tone="info" title="Voting starts after the ballot is locked">
        Voting opens {formatDeadline(election.start_date)} once you lock the ballot.
      </Banner>
    );
  }
  const { data: rows } = await (await createClient()).rpc('election_turnout', { p_election: id });
  const t = rows?.[0];
  const percent = (n: number) => (t && t.eligible > 0 ? `${Math.round((n / t.eligible) * 100)}%` : '–');
  const separate = separatePeriods(election);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Turnout" subtitle="Counts only. Nobody, admins included, can see how anyone voted.">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <StatTile label="On the voter roll" value={t?.eligible ?? 0} />
          <StatTile label="Voted for candidates" value={`${t?.voted_candidates ?? 0} (${percent(t?.voted_candidates ?? 0)})`} />
          <StatTile label="Voted on initiatives" value={`${t?.voted_initiatives ?? 0} (${percent(t?.voted_initiatives ?? 0)})`} />
        </div>
      </Panel>
      {actions.extend_voting === true && election.status === 'ballot_locked' && (
        <Panel title="Extend voting" subtitle={`Voting ${phase.votingOpen ? 'closes' : 'runs to'} ${formatDeadline(election.end_date)}.`}>
          <div className="flex flex-col gap-6 p-4">
            {!phase.votingOver && Date.now() <= Date.parse(election.end_date) && (
              <ExtendForm
                action={extendDeadline.bind(null, id, 'end_date')}
                label={separate ? 'Initiative voting closes' : 'Voting closes'}
                current={toLocalInput(election.end_date)}
                idPrefix="extend-voting"
              />
            )}
            {separate && election.candidate_voting_end && Date.now() <= Date.parse(election.candidate_voting_end) && (
              <ExtendForm
                action={extendDeadline.bind(null, id, 'candidate_voting_end')}
                label="Candidate voting closes"
                current={toLocalInput(election.candidate_voting_end)}
                idPrefix="extend-candidate-voting"
              />
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
