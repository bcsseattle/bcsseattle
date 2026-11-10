import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { TransactionStep, TransactionSteps } from '@/components/ui/transaction-step';
import { PageHeader } from '@/components/portal/page-header';
import { Ballot } from '@/components/elections/ballot';
import Candidates from '@/components/elections/candidates';
import dayjs from '@/libs/dayjs';
import { Database } from '@/types_db';
import { supportsUnopposedCandidates } from '@/utils/election-types';
import { ElectionType } from '@/types';
import { formatDate, formatDeadline } from '@/utils/format';

// Import voting period helper functions
import {
  currentUserIsActiveMember,
  isCandidateVotingOpen,
  getCandidateVotingPeriod,
  shouldShowUnopposedStatus
} from '@/utils/election-config';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';

type Election = Database['public']['Tables']['elections']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];
type Initiative = Database['public']['Tables']['initiatives']['Row'];

interface ElectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ElectionPage({ params }: ElectionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch election details
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: election, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', id)
    .single();

  if (!election || error) {
    redirect('/404');
  }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('election_id', election.id)
    .order('position');

  // Fetch initiatives for this election
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('*')
    .eq('election_id', election.id)
    .order('ballot_order');

  // Check if user has voted for candidates and initiatives separately
  let hasCandidateVotes = false;
  let hasInitiativeVotes = false;
  let userVotes = null;
  let candidateSession = null;
  let initiativeSession = null;

  if (user) {
    // Check for candidate votes
    const { data: candidateSessionData } = await supabase
      .from('vote_sessions')
      .select('id, confirmation_code, votes_cast, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', id)
      .eq('session_type', 'candidates')
      .single();

    hasCandidateVotes = !!candidateSessionData?.completed_at;
    candidateSession = candidateSessionData;

    // Check for initiative votes
    const { data: initiativeSessionData } = await supabase
      .from('vote_sessions')
      .select('id, confirmation_code, votes_cast, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', id)
      .eq('session_type', 'initiatives')
      .single();

    hasInitiativeVotes = !!initiativeSessionData?.completed_at;
    initiativeSession = initiativeSessionData;

    // Get all user votes for display
    if (hasCandidateVotes || hasInitiativeVotes) {
      const { data: userVotesData } = await supabase
        .from('votes')
        .select(
          `
          id,
          candidate_id,
          initiative_id,
          vote_value,
          voted_at,
          vote_type,
          candidates(full_name, position),
          initiatives(title)
        `
        )
        .eq('user_id', user.id)
        .eq('election_id', id);

      userVotes = userVotesData;
    }
  }

  async function getPositionOrder(
    electionType: string,
    candidates: Candidate[]
  ) {
    // Try to fetch from database first
    const { data: dbPositions } = await supabase
      .from('election_positions')
      .select('position, description, display_order')
      .eq('election_type', electionType)
      .order('display_order');

    if (dbPositions?.length) {
      return dbPositions;
    }

    // Fallback to hardcoded positions based on election type
    const defaultPositions = {
      leadership: [
        {
          position: 'President',
          description:
            'Chief executive officer who leads the organization and represents it publicly',
          display_order: 1
        },
        {
          position: 'Vice President',
          description:
            'Second in command who assists the president and steps in when needed',
          display_order: 2
        },
        {
          position: 'Secretary',
          description:
            'Records meeting minutes, manages correspondence, and maintains official documents',
          display_order: 3
        },
        {
          position: 'Treasurer',
          description:
            'Manages organizational finances, budget, and financial reporting',
          display_order: 4
        }
      ],
      board: [
        {
          position: 'Chairperson',
          description: 'Leads board meetings and oversees board activities',
          display_order: 1
        },
        {
          position: 'Board Member',
          description:
            'Participates in board decisions and organizational governance',
          display_order: 2
        }
      ],
      committee: [
        {
          position: 'Committee Chair',
          description:
            'Leads committee activities and coordinates with the board',
          display_order: 1
        },
        {
          position: 'Committee Member',
          description:
            'Participates in committee work and supports committee goals',
          display_order: 2
        }
      ]
    };

    const typePositions =
      defaultPositions[electionType as keyof typeof defaultPositions];
    if (typePositions) {
      return typePositions;
    }

    // Final fallback: extract unique positions from candidates
    return Array.from(new Set(candidates?.map((c) => c.position) || [])).map(
      (position, index) => ({
        position,
        description: '',
        display_order: index + 1
      })
    );
  }

  const positionOrder = await getPositionOrder(
    election.type!!,
    candidates || []
  );

  // Use consistent UTC for all date comparisons to avoid timezone issues
  const nowUtc = dayjs.utc();
  const startUtc = dayjs.utc(election.start_date);
  const endUtc = dayjs.utc(election.end_date);

  // Configuration for separate candidate/initiative voting periods
  const candidateVotingOpen = await isCandidateVotingOpen(id, nowUtc);
  const isInitiativeVotingOpen = (nowUtc.isAfter(startUtc) || nowUtc.isSame(startUtc)) && (nowUtc.isBefore(endUtc) || nowUtc.isSame(endUtc));
  
  const isVotingOpen = candidateVotingOpen || isInitiativeVotingOpen;
  const isUpcoming = nowUtc.isBefore(startUtc);
  const isClosed = nowUtc.isAfter(endUtc);
  
  // Determine if candidates were elected unopposed
  const candidatesElectedUnopposed = await shouldShowUnopposedStatus(id, candidateVotingOpen, !!(candidates && candidates.length > 0));

  // Get candidate voting period for display
  const candidateVotingPeriod = await getCandidateVotingPeriod(id);

  // Fix timezone issue by ensuring consistent UTC comparison
  const isNominationOpen =
    election.nomination_start &&
    election.nomination_end &&
    dayjs.utc(election.nomination_start).isBefore(nowUtc) &&
    nowUtc.isBefore(dayjs.utc(election.nomination_end));

  const supportsUnopposed = supportsUnopposedCandidates(election.type as ElectionType);

  // The ballot is offered only to approved, active members (BUG-007), the same
  // check the vote pages and endpoints make.
  const canVote = !!user && (await currentUserIsActiveMember());

  // What is still open to this member. Candidate voting has its own window
  // when separate periods are on (BUG-015, BUG-060).
  const offerCandidates =
    candidateVotingOpen && !hasCandidateVotes && !candidatesElectedUnopposed && !!candidates?.length;
  const offerInitiatives = isInitiativeVotingOpen && !hasInitiativeVotes && !!initiatives?.length;
  const showBallot = isVotingOpen && canVote && (offerCandidates || offerInitiatives);

  const ballotPositions = offerCandidates
    ? positionOrder
        .map((p) => ({
          position: p.position,
          description: p.description,
          candidates: (candidates ?? [])
            .filter((c) => c.position === p.position)
            .map((c) => ({ id: c.id, name: c.full_name, detail: c.bio }))
        }))
        .filter((p) => p.candidates.length > 0)
    : [];
  const ballotInitiatives = offerInitiatives
    ? (initiatives ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        url: i.additional_info_url
      }))
    : [];

  // Phase timeline (TransactionStep, Figma 11:1196).
  const nominationState =
    election.nomination_start && election.nomination_end
      ? isNominationOpen
        ? 'current'
        : nowUtc.isAfter(dayjs.utc(election.nomination_end))
          ? 'done'
          : 'upcoming'
      : null;
  const votingDetail = isVotingOpen
    ? `Closes ${formatDeadline(election.end_date)}`
    : isUpcoming
      ? `Opens ${formatDeadline(election.start_date)}`
      : `Closed ${formatDate(election.end_date)}`;

  const votedRows = (kind: 'candidates' | 'initiatives') =>
    (userVotes ?? [])
      .filter((vote) => (kind === 'candidates' ? vote.candidate_id && vote.vote_type === 'candidates' : vote.initiative_id && vote.vote_type === 'initiatives'))
      .map((vote) =>
        kind === 'candidates'
          ? ([vote.candidates?.position ?? '', vote.candidates?.full_name ?? ''] as const)
          : ([vote.initiatives?.title ?? '', vote.vote_value === 'yes' ? 'Support' : vote.vote_value === 'no' ? 'Oppose' : 'Abstain'] as const)
      );

  const phase = isNominationOpen
    ? { label: 'Nominations open', tone: 'blue' as const }
    : isVotingOpen
      ? { label: 'Voting open', tone: 'green' as const }
      : isClosed
        ? { label: 'Completed', tone: 'neutral' as const }
        : isUpcoming
          ? { label: 'Upcoming', tone: 'neutral' as const }
          : { label: 'Closed', tone: 'neutral' as const };

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbName id={election.id} name={election.title} />
      <PageHeader
        badge={<Badge tone={phase.tone}>{phase.label}</Badge>}
        back={{ href: '/elections', label: 'Elections' }}
        title={election.title}
        description={election.description}
        actions={
          isVotingOpen ? (
            <Link href={`/elections/${election.id}/results`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              View live results
            </Link>
          ) : undefined
        }
      />

      <TransactionSteps>
        {nominationState && (
          <TransactionStep
            label="Nomination period"
            state={nominationState}
            detail={`${formatDate(election.nomination_start!)} – ${formatDate(election.nomination_end!)}`}
          />
        )}
        {candidateVotingPeriod.end && (
          <TransactionStep
            label="Candidate voting"
            state={candidateVotingOpen ? 'current' : nowUtc.isAfter(dayjs.utc(candidateVotingPeriod.end)) ? 'done' : 'upcoming'}
            detail={`Closes ${formatDeadline(candidateVotingPeriod.end)}`}
          />
        )}
        <TransactionStep
          label="Voting period"
          state={isVotingOpen ? 'current' : isClosed ? 'done' : 'upcoming'}
          detail={votingDetail}
        />
        <TransactionStep
          label="Results"
          state={isClosed ? 'done' : 'upcoming'}
          detail={isClosed ? 'Available now' : 'After voting closes'}
        />
      </TransactionSteps>

      {supportsUnopposed && candidatesElectedUnopposed && (
        <Banner tone="success" title="Candidates elected unopposed">
          All candidates for this {election.type} election are running unopposed and have been automatically elected.
        </Banner>
      )}

      {isNominationOpen && (
        <Banner
          tone="info"
          title="Nominations are open"
          action={
            <Link href={`/elections/${election.id}/nominate`} className={buttonVariants({ size: 'sm' })}>
              Nominate yourself
            </Link>
          }
        >
          Submit your nomination for this election.
        </Banner>
      )}

      {isVotingOpen && !user && (
        <Banner
          tone="info"
          title="Voting is open"
          action={
            <Link
              href={`/signin?redirectTo=${encodeURIComponent(`/elections/${id}`)}`}
              className={buttonVariants({ size: 'sm' })}
            >
              Sign in to vote
            </Link>
          }
        >
          Sign in to cast your vote.
        </Banner>
      )}

      {isVotingOpen && user && !canVote && (
        <Banner tone="attention" title="Only approved members with active membership can vote">
          If you think this is wrong, contact BCS Seattle.
        </Banner>
      )}

      {/* The same fallback as before: an election with neither candidates nor initiatives. */}
      {isVotingOpen && canVote && !candidates?.length && !initiatives?.length && (
        <Link href={`/elections/${election.id}/vote`} className={buttonVariants({ className: 'self-start' })}>
          Vote now
        </Link>
      )}

      {showBallot && (
        <Ballot
          electionId={election.id}
          electionTitle={election.title}
          closesAt={election.end_date}
          positions={ballotPositions}
          initiatives={ballotInitiatives}
        />
      )}

      {(hasCandidateVotes || hasInitiativeVotes) && (
        <div className="grid gap-4 md:grid-cols-2">
          {hasCandidateVotes && candidateSession && (
            <VotedCard
              title="Your leadership votes"
              code={candidateSession.confirmation_code}
              href={`/elections/${election.id}/vote/candidates/confirmation?code=${candidateSession.confirmation_code}`}
              when={candidateSession.completed_at}
              rows={votedRows('candidates')}
            />
          )}
          {hasInitiativeVotes && initiativeSession && (
            <VotedCard
              title="Your initiative votes"
              code={initiativeSession.confirmation_code}
              href={`/elections/${election.id}/vote/initiatives/confirmation?code=${initiativeSession.confirmation_code}`}
              when={initiativeSession.completed_at}
              rows={votedRows('initiatives')}
            />
          )}
        </div>
      )}

      {isClosed && (
        <Banner
          tone="info"
          title="This election is complete"
          action={
            <Link href={`/elections/${election.id}/results`} className={buttonVariants({ size: 'sm' })}>
              View results
            </Link>
          }
        >
          See the final results.
        </Banner>
      )}

      {!showBallot && candidates && candidates.length > 0 && (
        <Candidates
          candidates={candidates}
          election={election}
          positionOrder={positionOrder}
          isNominationOpen={isNominationOpen}
          candidatesElectedUnopposed={candidatesElectedUnopposed}
          candidateVotingOpen={candidateVotingOpen}
        />
      )}

      {!showBallot && initiatives && initiatives.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-section text-foreground">Community initiatives</h2>
          {initiatives.map((initiative) => (
            <Card key={initiative.id} className="p-4">
              <h3 className="text-item text-foreground">{initiative.title}</h3>
              {initiative.description && (
                <p className="mt-1 text-sm text-muted-foreground">{initiative.description}</p>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

/** A part of the ballot this member has already submitted. */
function VotedCard({
  title,
  code,
  href,
  when,
  rows
}: {
  title: string;
  code: string | null;
  href: string;
  when: string | null;
  rows: (readonly [string, string])[];
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-section text-foreground">{title}</h2>
        <Badge tone="green">Submitted</Badge>
      </div>
      {rows.length > 0 && (
        <dl className="text-sm">
          {rows.map(([question, answer]) => (
            <div key={question} className="flex justify-between gap-3 border-b py-2 last:border-b-0">
              <dt className="text-muted-foreground">{question}</dt>
              <dd className="text-right font-medium text-foreground">{answer}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-0 text-caption text-muted-foreground">
        {when && `Submitted ${formatDeadline(when)}. `}Confirmation code: <span className="font-mono">{code}</span>
      </p>
      <Link href={href} className="self-start text-caption font-medium text-accent underline-offset-4 hover:underline">
        View confirmation
      </Link>
    </Card>
  );
}
