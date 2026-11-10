import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { PageHeader } from '@/components/portal/page-header';
import { Ballot } from '@/components/elections/ballot';
import Candidates from '@/components/elections/candidates';
import { PhaseTimeline } from '@/components/elections/phase-timeline';
import { VotedCard } from '@/components/elections/voted-card';
import { supportsUnopposedCandidates } from '@/utils/election-types';
import { ElectionType } from '@/types';
import { formatDeadline } from '@/utils/format';
import { currentUserIsActiveMember } from '@/utils/election-config';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import {
  ballotOffer,
  ballotQuestions,
  electedUnopposed,
  electionPhase,
  positionOrder as orderPositions
} from '@/utils/elections/rules';
import { BreadcrumbName } from '@/components/ui/breadcrumbs';

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

  // This election's own positions (ballot_positions); the shared rules fall back to defaults.
  const { data: dbPositions } = await supabase
    .from('ballot_positions')
    .select('position:title, description, display_order')
    .eq('election_id', id)
    .order('display_order');
  const positionOrder = orderPositions(election.type, dbPositions, candidates || []);

  // The shared phase: status (what admins decided) plus the dates, windows
  // inclusive. Voting is open only once the ballot is locked (BUG-015, BUG-060).
  const windows = electionPhase(election);
  const { candidateVotingOpen, votingOpen: isVotingOpen, votingOver: isClosed } = windows;

  // Determine if candidates were elected unopposed
  const candidatesElectedUnopposed = electedUnopposed(election, candidates ?? [], candidateVotingOpen);

  // Edges included, as the server accepts nominations (W15).
  const isNominationOpen = windows.nominationsOpen;

  // The nomination flow with review (Phase 3) is behind the flag; it shows the
  // member what's waiting for them in this election.
  const managed = await checkFeatureFlag('enableElectionManagement');
  const { data: myNominationRows } =
    managed && user
      ? await supabase
          .from('nominations')
          .select('id, position, status, rejection_reason')
          .eq('election_id', id)
          .eq('nominee_user_id', user.id)
          .in('status', ['awaiting_acceptance', 'submitted', 'rejected'])
      : { data: [] };
  const myNominations = (['draft', 'scheduled'].includes(election.status) ? (myNominationRows ?? []) : []).filter(
    (n) => n.status !== 'awaiting_acceptance' || isNominationOpen
  );

  const supportsUnopposed = supportsUnopposedCandidates(election.type as ElectionType);

  // The ballot is offered only to approved, active members (BUG-007), the same
  // check the vote pages and endpoints make.
  const canVote = !!user && (await currentUserIsActiveMember());

  // What is still open to this member.
  const { offerCandidates, offerInitiatives } = ballotOffer({
    windows,
    votedCandidates: hasCandidateVotes,
    votedInitiatives: hasInitiativeVotes,
    electedUnopposed: candidatesElectedUnopposed,
    candidateCount: candidates?.length ?? 0,
    initiativeCount: initiatives?.length ?? 0
  });
  const showBallot = isVotingOpen && canVote && (offerCandidates || offerInitiatives);

  const { positions: ballotPositions, initiatives: ballotInitiatives } = ballotQuestions({
    offerCandidates,
    offerInitiatives,
    positions: positionOrder,
    candidates: candidates ?? [],
    initiatives: initiatives ?? []
  });

  const votedRows = (kind: 'candidates' | 'initiatives') =>
    (userVotes ?? [])
      .filter((vote) => (kind === 'candidates' ? vote.candidate_id && vote.vote_type === 'candidates' : vote.initiative_id && vote.vote_type === 'initiatives'))
      .map((vote) =>
        kind === 'candidates'
          ? ([vote.candidates?.position ?? '', vote.candidates?.full_name ?? ''] as const)
          : ([vote.initiatives?.title ?? '', vote.vote_value === 'yes' ? 'Support' : vote.vote_value === 'no' ? 'Oppose' : 'Abstain'] as const)
      );

  const phase = { label: windows.label.member, tone: windows.label.tone };

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

      <PhaseTimeline
        election={election}
        windows={windows}
        nominationsOpen={!!isNominationOpen}
        // W16: shows whenever candidate_voting_end is set.
        candidateVotingEnd={election.candidate_voting_end}
      />

      {supportsUnopposed && candidatesElectedUnopposed && (
        <Banner tone="success" title="Candidates elected unopposed">
          All candidates for this {election.type} election are running unopposed and have been automatically elected.
        </Banner>
      )}

      {election.status === 'cancelled' && (
        <Banner tone="attention" title="This election was cancelled">
          {election.cancel_reason ?? 'Nothing from it will be counted.'}
        </Banner>
      )}
      {windows.phase === 'draft' && (
        <Banner tone="info" title="Preview">
          This is how members will see the election once it’s published. Only admins can see a draft.
        </Banner>
      )}
      {isNominationOpen && (
        <Banner
          tone="info"
          title="Nominations are open"
          action={
            <Link href={`/elections/${election.id}/nominate`} className={buttonVariants({ size: 'sm' })}>
              {managed ? 'Nominate' : 'Nominate yourself'}
            </Link>
          }
        >
          {managed
            ? `Nominate yourself or another approved member by ${formatDeadline(election.nomination_end!)}.`
            : 'Submit your nomination for this election.'}
        </Banner>
      )}
      {myNominations.map((n) => (
        <Banner
          key={n.id}
          tone={n.status === 'awaiting_acceptance' ? 'attention' : 'info'}
          title={
            n.status === 'awaiting_acceptance'
              ? `You’ve been nominated for ${n.position}`
              : n.status === 'submitted'
                ? `Your nomination for ${n.position} is waiting for review`
                : `Your nomination for ${n.position} wasn’t approved`
          }
          action={
            <Link href={`/elections/${election.id}/nominations/${n.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              {n.status === 'awaiting_acceptance' ? 'Accept or decline' : 'View'}
            </Link>
          }
        >
          {n.status === 'rejected' ? n.rejection_reason : n.status === 'awaiting_acceptance' ? 'Answer before nominations close.' : 'You can change your details until the ballot is locked.'}
        </Banner>
      ))}

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
            <VotedCard title="Your leadership votes" rows={votedRows('candidates')}>
              <ConfirmationLink
                code={candidateSession.confirmation_code}
                href={`/elections/${election.id}/vote/candidates/confirmation?code=${candidateSession.confirmation_code}`}
                when={candidateSession.completed_at}
              />
            </VotedCard>
          )}
          {hasInitiativeVotes && initiativeSession && (
            <VotedCard title="Your initiative votes" rows={votedRows('initiatives')}>
              <ConfirmationLink
                code={initiativeSession.confirmation_code}
                href={`/elections/${election.id}/vote/initiatives/confirmation?code=${initiativeSession.confirmation_code}`}
                when={initiativeSession.completed_at}
              />
            </VotedCard>
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

/** A submitted part's code and its confirmation page. */
function ConfirmationLink({ code, href, when }: { code: string | null; href: string; when: string | null }) {
  return (
    <>
      <p className="mt-0 text-caption text-muted-foreground">
        {when && `Submitted ${formatDeadline(when)}. `}Confirmation code: <span className="font-mono">{code}</span>
      </p>
      <Link href={href} className="self-start text-caption font-medium text-accent underline-offset-4 hover:underline">
        View confirmation
      </Link>
    </>
  );
}
