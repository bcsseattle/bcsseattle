'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vote } from 'lucide-react';
import { BallotPosition } from '@/components/elections/ballot-position';
import {
  BallotReview,
  BallotSubmitted,
  useBallot,
  type BallotInitiativeData,
  type BallotPositionData,
  type SendBallotPart
} from '@/components/elections/ballot-steps';
import { InitiativeCard } from '@/components/elections/initiative-card';
import { PhaseTimeline } from '@/components/elections/phase-timeline';
import { ActionBar } from '@/components/ui/action-bar';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { ballotQuestions } from '@/utils/elections/rules';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import { loadElection, type ElectionData } from '~/components/elections/election';
import { api } from '~/lib/api';
import { useMember } from '~/lib/member';
import { useSession } from '~/lib/session';

/**
 * Voting, sharing the website's review and submitted steps and submission
 * (components/elections/ballot-steps.tsx): the ballot (Figma 17:2284), Review
 * votes (25:2792, ?step=review so Back returns to the ballot), the Submit
 * ballot sheet (25:2931) and Ballot submitted (25:3075). Votes go only to the
 * existing endpoints, which keep every check.
 */
export default function BallotFlow() {
  const id = useSearchParams().get('id') ?? '';
  const userId = useSession().session!.user.id;
  const me = useMember();
  // Loaded once: reloading on resume must not wipe the answers in progress.
  const [state, setState] = useState<{
    data?: ElectionData;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const load = () => {
    setState({ loading: true });
    loadElection(id, userId).then(
      (data) => setState({ data, loading: false }),
      (e: Error) => setState({ error: e.message, loading: false })
    );
  };
  useEffect(load, [id, userId]);

  return (
    <Loaded state={{ ...state, reload: async () => load() }}>
      {(d) => {
        const { positions, initiatives } = ballotQuestions(d);
        if (me.data && !me.data.isActive) {
          return (
            <Closed
              d={d}
              text="Only approved members with active membership can vote. If you think this is wrong, contact BCS Seattle."
            />
          );
        }
        if (!d.phase.votingOpen)
          return <Closed d={d} text="Voting is not open for this election." />;
        if (positions.length + initiatives.length === 0) {
          return (
            <Closed
              d={d}
              text="You have already voted on everything on this ballot."
            />
          );
        }
        return <Ballot d={d} positions={positions} initiatives={initiatives} />;
      }}
    </Loaded>
  );
}

function Closed({ d, text }: { d: ElectionData; text: string }) {
  return (
    <>
      <AppHeader title={d.election.title} back={{}} />
      <StatePanel icon={Vote} title="No ballot to fill in">
        {text}
      </StatePanel>
    </>
  );
}

function Ballot({
  d,
  positions,
  initiatives
}: {
  d: ElectionData;
  positions: BallotPositionData[];
  initiatives: BallotInitiativeData[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { election } = d;
  const step = params.get('step') === 'review' ? 'review' : 'ballot';

  const send: SendBallotPart = async (part, body) => {
    try {
      const data = await api<{ confirmationCode: string }>(
        `/api/elections/${election.id}/vote/${part}`,
        { json: body }
      );
      return { ok: true, code: data.confirmationCode };
    } catch (e) {
      // api() throws the server's message; fetch itself throws a TypeError when offline.
      const error =
        e instanceof Error && !(e instanceof TypeError)
          ? e.message
          : 'Your votes could not be sent. Check your connection and try again.';
      return { ok: false, error };
    }
  };
  const b = useBallot({ positions, initiatives, send, step });
  const { candidateVotes, initiativeVotes, answered, total } = b;

  useEffect(() => {
    if (!b.focusQuestion) window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, b.submittedAt]);

  const goTo = (questionId: string) => {
    b.focus(questionId);
    router.back();
  };

  // ---------------------------------------------------------------- submitted
  if (b.submittedAt) {
    return (
      <BallotSubmitted
        ballot={b}
        electionTitle={election.title}
        closesAt={election.end_date}
        className="flex min-h-dvh flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)+3rem)]"
        retryClassName="h-11"
        fill
        action={
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => router.replace(`/elections/view/?id=${election.id}`)}
          >
            Back to election
          </Button>
        }
      />
    );
  }

  // ---------------------------------------------------------------- review
  if (step === 'review') {
    return (
      <>
        <AppHeader title="Review votes" back={{ label: 'Ballot' }} />
        <div className="flex flex-1 flex-col gap-6 px-4 pt-4">
          <p className="text-body text-muted-foreground">
            Check your choices before you submit. Once submitted, your ballot
            can’t be changed.
          </p>
          <BallotReview ballot={b} goTo={goTo} headingLevel="h2" hintAboveBar />
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- ballot
  return (
    <>
      <AppHeader title={election.title} back={{}} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-4">
        <p className="text-body text-muted-foreground">
          Nothing is counted until you submit. You will see every choice before
          you do.
        </p>
        <PhaseTimeline
          election={election}
          windows={d.phase}
          nominationsOpen={d.phase.nominationsOpen}
          candidateVotingEnd={
            d.phase.separate ? election.candidate_voting_end : null
          }
          className="rounded-lg border bg-card p-4"
        />
        {positions.length > 0 && (
          <>
            <h2 className="mt-2 text-section text-foreground">
              Leadership positions
            </h2>
            {positions.map((p) => (
              <div
                key={p.position}
                id={`q-position-${p.position}`}
                className="scroll-mt-20"
              >
                <BallotPosition
                  position={p.position}
                  description={p.description}
                  candidates={p.candidates}
                  seats={p.seats}
                  value={candidateVotes[p.position]}
                  onValueChange={(v) =>
                    b.setCandidateVotes((s) => ({ ...s, [p.position]: v }))
                  }
                />
              </div>
            ))}
          </>
        )}
        {initiatives.length > 0 && (
          <>
            <h2 className="mt-2 text-section text-foreground">
              Community initiatives
            </h2>
            {initiatives.map((i) => (
              <div
                key={i.id}
                id={`q-initiative-${i.id}`}
                className="scroll-mt-20"
              >
                <InitiativeCard
                  title={i.title}
                  description={i.description}
                  moreInfoUrl={i.url}
                  value={initiativeVotes[i.id]}
                  onValueChange={(v) =>
                    b.setInitiativeVotes((s) => ({ ...s, [i.id]: v }))
                  }
                  optionId={(v) => `${v}-${i.id}`}
                />
              </div>
            ))}
          </>
        )}
        <ActionBar
          summary={`${answered} of ${total} answered · skip anything you are unsure about`}
        >
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() =>
              router.push(`/elections/ballot/?id=${election.id}&step=review`)
            }
          >
            Review votes
          </Button>
        </ActionBar>
      </div>
    </>
  );
}
