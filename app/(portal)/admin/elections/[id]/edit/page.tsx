import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';
import { Panel } from '@/components/portal/panel';
import { Banner } from '@/components/ui/banner';
import { buttonVariants } from '@/components/ui/button';
import { BallotForm } from '@/components/admin/elections/ballot-form';
import { BasicsForm } from '@/components/admin/elections/basics-form';
import { SettingsForm } from '@/components/admin/elections/settings-form';
import { StepNav } from '@/components/admin/elections/steps';
import { editableSteps, type StepKey } from '@/components/admin/elections/step-list';
import { TimelineForm } from '@/components/admin/elections/timeline-form';
import { PublishButton } from '@/components/admin/elections/transition-buttons';
import { createClient } from '@/utils/supabase/server';
import { formatDeadline } from '@/utils/format';
import {
  separatePeriods,
  toLocalInput,
  validateTimeline
} from '@/utils/elections/rules';
import { ELECTION_TYPE_CONFIGS } from '@/utils/election-types';
import type { ElectionType } from '@/types';
import {
  publishElection,
  saveBallot,
  saveBasics,
  saveSettings,
  saveTimeline
} from '../../actions';
import { loadAdminElection, requireElectionManagement } from '../../data';

const TYPE_LABEL: Record<string, string> = {
  leadership: 'leadership',
  board: 'board',
  initiative: 'initiative'
};

// The admin layout already turns away anyone who isn't an admin.
export default async function EditElectionPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  await requireElectionManagement();
  const { id } = await props.params;
  const { step: rawStep } = await props.searchParams;
  const data = await loadAdminElection(id);
  const { election, positions, initiatives, actions } = data;
  const isDraft = election.status === 'draft';

  // What can still change depends on the status (editableSteps); a step that
  // can't (or the step after the last one) goes back to the overview.
  const allowed = editableSteps(election.status);
  const step: StepKey = allowed.includes(rawStep as StepKey) ? (rawStep as StepKey) : 'basics';
  if (rawStep && !allowed.includes(rawStep as StepKey)) redirect(`/admin/elections/${id}`);

  const type = (election.type ?? 'leadership') as ElectionType;
  // A run-off has positions but no nominations (its candidates are the tied ones).
  // No nominations window for a run-off, or once the ballot is locked (nominations are over).
  const hasPositions = positions.length > 0 && !election.runoff_of && election.status !== 'ballot_locked';
  // Without positions the window is optional: it's when members propose initiatives.
  const nominations = election.runoff_of || election.status === 'ballot_locked' ? 'none' : hasPositions ? 'required' : 'optional';

  let body: React.ReactNode;
  if (step === 'basics') {
    body = (
      <BasicsForm
        action={saveBasics.bind(null, id)}
        initial={{
          title: election.title,
          description: election.description ?? '',
          type
        }}
        typeLocked={!['draft', 'scheduled'].includes(election.status)}
      />
    );
  } else if (step === 'ballot') {
    const supabase = await createClient();
    const { data: template } = await supabase
      .from('election_positions')
      .select('position, description')
      .eq('election_type', type)
      .order('display_order');
    body = (
      <BallotForm
        action={saveBallot.bind(null, id)}
        typeLabel={TYPE_LABEL[type]}
        template={(template ?? []).map((t) => ({
          title: t.position,
          description: t.description ?? '',
          seats: 1
        }))}
        initial={{
          positions: positions.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? '',
            seats: p.seats
          })),
          initiatives: initiatives.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description ?? '',
            additional_info_url: t.additional_info_url ?? '',
            pass_threshold: t.pass_threshold as 'majority' | 'two_thirds'
          }))
        }}
      />
    );
  } else if (step === 'timeline') {
    body = (
      <TimelineForm
        action={saveTimeline.bind(null, id)}
        nominations={nominations}
        initial={{
          nomination_start: toLocalInput(election.nomination_start),
          nomination_end: toLocalInput(election.nomination_end),
          start_date: toLocalInput(election.start_date),
          end_date: toLocalInput(election.end_date),
          candidate_voting_start: toLocalInput(election.candidate_voting_start),
          candidate_voting_end: toLocalInput(election.candidate_voting_end),
          results_date: toLocalInput(election.results_date),
          separate: separatePeriods(election)
        }}
      />
    );
  } else if (step === 'settings') {
    body = (
      <SettingsForm
        action={saveSettings.bind(null, id)}
        typeShowsUnopposed={
          ELECTION_TYPE_CONFIGS[type].defaultShowUnopposedStatus
        }
        initial={{
          eligibility_cutoff: toLocalInput(election.eligibility_cutoff),
          show_unopposed_status:
            election.show_unopposed_status === null
              ? 'default'
              : election.show_unopposed_status
                ? 'show'
                : 'hide'
        }}
      />
    );
  } else {
    body = <Review data={data} />;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      <PageHeader
        back={{ href: `/admin/elections/${id}`, label: election.title }}
        title={isDraft ? 'Set up the election' : 'Edit the election'}
        description={
          isDraft
            ? 'Only admins can see a draft. Each step saves as you go.'
            : election.status === 'ballot_locked'
              ? 'The ballot is locked, so only the title, description and voting dates and times can change. Changes show to members straight away and are recorded in the activity log.'
              : election.status === 'scheduled'
                ? 'Changes show to members straight away and are recorded in the activity log.'
                : 'Voting is over, so only the title and description can change.'
        }
      />
      {allowed.length > 1 && <StepNav current={step} electionId={id} keys={allowed} />}
      {body}
      {step === 'review' && (
        <div className="flex flex-wrap gap-3">
          {actions.publish === true && (
            <PublishButton
              run={publishElection.bind(null, id)}
              summary={`${positions.length} position${positions.length === 1 ? '' : 's'} and ${initiatives.length} initiative${initiatives.length === 1 ? '' : 's'}.${hasPositions ? ` Nominations open ${formatDeadline(election.nomination_start!)}.` : ''} Voting opens ${formatDeadline(election.start_date)}.`}
            />
          )}
          <Link
            href={`/elections/${id}`}
            className={buttonVariants({ variant: 'outline' })}
            target="_blank"
          >
            Preview what members will see
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        </div>
      )}
    </div>
  );
}

/** Step 5: everything on one page, what still blocks publishing, and a preview link. */
function Review({
  data
}: {
  data: Awaited<ReturnType<typeof loadAdminElection>>;
}) {
  const { election, positions, initiatives, actions } = data;
  const timeline = validateTimeline(election, {
    hasPositions: positions.length > 0 && !election.runoff_of
  });
  const separate = separatePeriods(election);
  const row = (label: string, value: React.ReactNode, step: StepKey) => (
    <div className="flex flex-col gap-1 px-4 py-3 md:flex-row md:gap-4">
      <dt className="text-sm text-muted-foreground md:w-48 md:shrink-0">
        {label}
      </dt>
      <dd className="m-0 flex-1 text-sm">{value}</dd>
      <dd className="m-0">
        <Link
          href={`/admin/elections/${election.id}/edit?step=${step}`}
          className="text-sm underline underline-offset-2"
        >
          Change<span className="sr-only"> {label.toLowerCase()}</span>
        </Link>
      </dd>
    </div>
  );
  const at = (iso: string | null) => (iso ? formatDeadline(iso) : 'Not set');

  return (
    <div className="flex flex-col gap-4">
      {actions.publish === true ? (
        <Banner tone="success" title="Ready to publish">
          Check the details, preview what members will see, then publish.
        </Banner>
      ) : (
        <Banner tone="attention" title="Not ready to publish yet">
          {actions.publish}
        </Banner>
      )}
      {timeline.warning && (
        <Banner tone="attention" title="Short notice">
          {timeline.warning}
        </Banner>
      )}
      <Panel title="Summary">
        <dl className="m-0 divide-y">
          {row('Title', election.title, 'basics')}
          {row(
            'Type',
            {
              leadership: 'Leadership',
              board: 'Board',
              initiative: 'Initiatives only'
            }[election.type ?? 'leadership'],
            'basics'
          )}
          {row(
            'Positions',
            positions.length
              ? positions
                  .map(
                    (p) =>
                      `${p.title}${p.seats > 1 ? ` (${p.seats} seats)` : ''}`
                  )
                  .join(', ')
              : 'None',
            'ballot'
          )}
          {row(
            'Initiatives',
            initiatives.length
              ? initiatives.map((t) => t.title).join(', ')
              : 'None',
            'ballot'
          )}
          {positions.length > 0 && !election.runoff_of &&
            row(
              'Nominations',
              `${at(election.nomination_start)} to ${at(election.nomination_end)}`,
              'timeline'
            )}
          {row(
            separate ? 'Initiative voting' : 'Voting',
            `${at(election.start_date)} to ${at(election.end_date)}`,
            'timeline'
          )}
          {separate &&
            row(
              'Candidate voting',
              `${at(election.candidate_voting_start ?? election.start_date)} to ${at(election.candidate_voting_end ?? election.end_date)}`,
              'timeline'
            )}
          {row('Results expected', at(election.results_date), 'timeline')}
          {row(
            'Membership cutoff',
            election.eligibility_cutoff
              ? at(election.eligibility_cutoff)
              : 'When the ballot is locked',
            'settings'
          )}
        </dl>
      </Panel>
    </div>
  );
}
