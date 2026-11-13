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
  electedUnopposedNow,
  electionPhase,
  positionOrder as orderPositions
} from '@/utils/elections/rules';
import { initiativeResponseLabel } from '@/utils/elections/initiative-options';
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
  let combined: { confirmation_code: string; confirmed_at: string | null } | null = null;

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

    // The member's own votes. Having any of a kind counts as voted, whichever
    // ballot cast them, as the vote handlers decide (W8).
    {
      const { data: userVotesData } = await supabase
        .from('votes')
        .select(
          `
          id,
          candidate_id,
          initiative_id,
          vote_value,
          response_value,
          voted_at,
          vote_type,
          candidates(full_name, position),
          initiatives(title, response_type, response_options)
        `
        )
        .eq('user_id', user.id)
        .eq('election_id', id);

      userVotes = userVotesData;
      hasCandidateVotes ||= !!userVotes?.some((v) => v.candidate_id);
      hasInitiativeVotes ||= !!userVotes?.some((v) => v.initiative_id);
      // The election page's own (combined) ballot records one confirmation, not sessions.
      if (userVotes?.length) {
        const { data } = await supabase
          .from('vote_confirmations')
          .select('confirmation_code, confirmed_at')
          .eq('user_id', user.id)
          .eq('election_id', id)
          .eq('session_type', 'combined')
          .maybeSingle();
        combined = data;
      }
    }
  }

  // This election's own positions (ballot_positions); the shared rules fall back to defaults.
  const { data: dbPositions } = await supabase
    .from('ballot_positions')
    .select('position:title, description, display_order, seats, vacant, unopposed_decision')
    .eq('election_id', id)
    .order('display_order');
  const positionOrder = orderPositions(election.type, dbPositions, candidates || []);

  // The shared phase: status (what admins decided) plus the dates, windows
  // inclusive. Voting is open only once the ballot is locked (BUG-015, BUG-060).
  const windows = electionPhase(election);
  const { candidateVotingOpen, votingOpen: isVotingOpen, votingOver: isClosed } = windows;

  // Elected unopposed: decided at lock, or once candidate voting has closed (W26).
  const candidatesElectedUnopposed = electedUnopposedNow(election, candidates ?? [], positionOrder);

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
          .in('status', ['awaiting_acceptance', 'submitted', 'approved', 'rejected'])
      : { data: [] };
  const myNominations = (['draft', 'scheduled'].includes(election.status) ? (myNominationRows ?? []) : []).filter(
    (n) => n.status !== 'awaiting_acceptance' || isNominationOpen
  );
  // The member's own initiative proposals, until the ballot is locked.
  const { data: myProposalRows } =
    managed && user && ['draft', 'scheduled'].includes(election.status)
      ? await supabase
          .from('initiative_proposals')
          .select('id, title, status, rejection_reason')
          .eq('election_id', id)
          .eq('proposed_by', user.id)
          .in('status', ['submitted', 'approved', 'rejected'])
          .order('created_at')
      : { data: [] };
  const myProposals = myProposalRows ?? [];

  const supportsUnopposed = supportsUnopposedCandidates(election.type as ElectionType);

  // The ballot is offered only to approved, active members (BUG-007), the same
  // check the vote pages and endpoints make.
  const activeMember = !!user && (await currentUserIsActiveMember());
  // The voter roll is taken when the ballot is locked (B11): members who joined
  // after the cutoff, or after the lock, can't vote in this election.
  const { data: rollRow } =
    activeMember && isVotingOpen
      ? await supabase.from('election_voters').select('user_id').eq('election_id', id).eq('user_id', user!.id).maybeSingle()
      : { data: null };
  const offRoll = activeMember && isVotingOpen && !rollRow;
  const canVote = activeMember && !offRoll;

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
      // Whichever ballot cast them: separate (candidates, initiatives) or the combined one (W8).
      .filter((vote) => (kind === 'candidates' ? vote.candidate_id : vote.initiative_id))
      .map((vote) =>
        kind === 'candidates'
          ? ([vote.candidates?.position ?? '', vote.candidates?.full_name ?? ''] as const)
          : ([vote.initiatives?.title ?? '', initiativeResponseLabel(vote.initiatives?.response_type, vote.initiatives?.response_options, vote.response_value ?? vote.vote_value)] as const)
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
      />

      <PhaseTimeline
        election={election}
        windows={windows}
        nominationsOpen={!!isNominationOpen}
        // Only when separate periods are on, so candidate_voting_end applies (W16).
        candidateVotingEnd={windows.separate ? election.candidate_voting_end : null}
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
      {isNominationOpen && (managed || positionOrder.length > 0) && (
        <Banner
          tone="info"
          title={positionOrder.length > 0 ? 'Nominations are open' : 'Initiative proposals are open'}
          action={
            <div className="flex flex-wrap gap-2">
              {positionOrder.length > 0 && (
                <Link href={`/elections/${election.id}/nominate`} className={buttonVariants({ size: 'sm' })}>
                  {managed ? 'Nominate' : 'Nominate yourself'}
                </Link>
              )}
              {managed && (
                <Link
                  href={`/elections/${election.id}/propose`}
                  className={buttonVariants({ size: 'sm', variant: positionOrder.length > 0 ? 'outline' : 'default' })}
                >
                  Propose an initiative
                </Link>
              )}
            </div>
          }
        >
          {!managed
            ? 'Submit your nomination for this election.'
            : positionOrder.length > 0
              ? `Nominate yourself or another approved member, or propose a question for members to vote on, by ${formatDeadline(election.nomination_end!)}.`
              : `Propose a question for members to vote on by ${formatDeadline(election.nomination_end!)}.`}
        </Banner>
      )}
      {myProposals.map((p) => (
        <Banner
          key={p.id}
          tone={p.status === 'rejected' ? 'attention' : 'info'}
          title={
            p.status === 'approved'
              ? 'Your initiative is on the ballot'
              : p.status === 'submitted'
                ? 'Your initiative is waiting for review'
                : 'Your initiative wasn’t approved'
          }
          action={
            <Link href={`/elections/${election.id}/proposals/${p.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              View
              <span className="sr-only">: {p.title}</span>
            </Link>
          }
        >
          {p.status === 'rejected' ? `“${p.title}”: ${p.rejection_reason}` : `“${p.title}”`}
        </Banner>
      ))}
      {myNominations.map((n) => (
        <Banner
          key={n.id}
          tone={n.status === 'awaiting_acceptance' ? 'attention' : 'info'}
          title={
            n.status === 'awaiting_acceptance'
              ? `You’ve been nominated for ${n.position}`
              : n.status === 'approved'
                ? `You’re on the ballot for ${n.position}`
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
          {n.status === 'rejected' ? n.rejection_reason : n.status === 'awaiting_acceptance' ? 'Answer before nominations close.' : n.status === 'approved' ? 'You can change your details or withdraw until the ballot is locked.' : 'You can change your details until the ballot is locked.'}
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

      {offRoll && (
        <Banner tone="attention" title="You aren’t on the voter roll for this election">
          The roll was set when the ballot was locked
          {election.eligibility_cutoff ? `, from members who had joined by ${formatDeadline(election.eligibility_cutoff)}` : ''}. If you think this is wrong, contact BCS Seattle.
        </Banner>
      )}
      {windows.lockOverdue && (
        <Banner tone="info" title="Voting will open soon">
          The ballot is being finalised. Check back shortly.
        </Banner>
      )}
      {windows.phase === 'ballot_ready' && (
        <Banner tone="info" title={`Voting opens ${formatDeadline(windows.candidateWindow.start < election.start_date ? windows.candidateWindow.start : election.start_date)}`}>
          The ballot is final. You’ll be able to vote here then.
        </Banner>
      )}
      {isVotingOpen && user && !activeMember && (
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
          {hasCandidateVotes && (
            <VotedCard title="Your leadership votes" rows={votedRows('candidates')}>
              {candidateSession?.completed_at ? (
                <ConfirmationLink
                  code={candidateSession.confirmation_code}
                  href={`/elections/${election.id}/vote/candidates/confirmation?code=${candidateSession.confirmation_code}`}
                  when={candidateSession.completed_at}
                />
              ) : (
                combined && (
                  <ConfirmationLink code={combined.confirmation_code} href={`/elections/${election.id}/vote/confirmation`} when={combined.confirmed_at} />
                )
              )}
            </VotedCard>
          )}
          {hasInitiativeVotes && (
            <VotedCard title="Your initiative votes" rows={votedRows('initiatives')}>
              {initiativeSession?.completed_at ? (
                <ConfirmationLink
                  code={initiativeSession.confirmation_code}
                  href={`/elections/${election.id}/vote/initiatives/confirmation?code=${initiativeSession.confirmation_code}`}
                  when={initiativeSession.completed_at}
                />
              ) : (
                combined && (
                  <ConfirmationLink code={combined.confirmation_code} href={`/elections/${election.id}/vote/confirmation`} when={combined.confirmed_at} />
                )
              )}
            </VotedCard>
          )}
        </div>
      )}

      {isClosed && ['ballot_locked', 'certified'].includes(election.status) && (
        <Banner tone="info" title="Voting has closed">
          {election.results_date
            ? `Results are expected ${formatDeadline(election.results_date)}, once the votes are certified.`
            : 'Results are published once the votes are certified.'}
        </Banner>
      )}
      {isClosed && ['completed', 'archived'].includes(election.status) && (
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

      {!showBallot && positionOrder.length > 0 && (
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
