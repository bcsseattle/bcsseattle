'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vote } from 'lucide-react';
import { BallotPosition, SKIP } from '@/components/elections/ballot-position';
import {
  InitiativeCard,
  INITIATIVE_CHOICES,
  type InitiativeVote
} from '@/components/elections/initiative-card';
import { ReviewRow } from '@/components/elections/review-row';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { ResultHeader } from '@/components/ui/result-header';
import { StatePanel } from '@/components/ui/state-panel';
import { formatDeadline } from '@/utils/format';
import { AppHeader } from '~/components/app-header';
import { Loaded } from '~/components/screen';
import {
  ballotQuestions,
  loadElection,
  type ElectionData
} from '~/components/elections/election';
import { PhaseTimeline } from '~/components/elections/phase-timeline';
import { api } from '~/lib/api';
import { useMember } from '~/lib/member';
import { useSession } from '~/lib/session';
import { useData } from '~/lib/use-data';

type Part = 'candidates' | 'initiatives';
type PartResult =
  | { ok: true; code: string; count: number }
  | { ok: false; error: string; count: number };

/**
 * Voting, as the website's Ballot (components/elections/ballot.tsx): the
 * ballot (Figma 17:2284), Review votes (25:2792, ?step=review so Back returns
 * to the ballot), the Submit ballot sheet (25:2931) and Ballot submitted
 * (25:3075). Votes go only to the existing endpoints, which keep every check.
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
  positions: ReturnType<typeof ballotQuestions>['positions'];
  initiatives: ReturnType<typeof ballotQuestions>['initiatives'];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { election } = d;
  const step = params.get('step') === 'review' ? 'review' : 'ballot';
  const [candidateVotes, setCandidateVotes] = useState<Record<string, string>>(
    {}
  );
  const [initiativeVotes, setInitiativeVotes] = useState<
    Record<string, InitiativeVote>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<Partial<Record<Part, PartResult>>>({});
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [focusQuestion, setFocusQuestion] = useState<string | null>(null);

  const candidateName = (id: string) =>
    positions.flatMap((p) => p.candidates).find((c) => c.id === id)?.name ?? '';
  const answeredPositions = positions.filter(
    (p) => candidateVotes[p.position] && candidateVotes[p.position] !== SKIP
  );
  const answeredInitiatives = initiatives.filter((i) => initiativeVotes[i.id]);
  const total = positions.length + initiatives.length;
  const answered = answeredPositions.length + answeredInitiatives.length;
  const blank = total - answered;

  // Change / Answer on the review screen go back to that question.
  useEffect(() => {
    if (step !== 'ballot' || !focusQuestion) return;
    const el = document.getElementById(focusQuestion);
    el?.scrollIntoView({ block: 'center' });
    (el?.querySelector('[role="radio"]') as HTMLElement | null)?.focus({
      preventScroll: true
    });
    setFocusQuestion(null);
  }, [step, focusQuestion]);

  useEffect(() => {
    if (!focusQuestion) window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, submittedAt]);

  const goTo = (questionId: string) => {
    setFocusQuestion(questionId);
    router.back();
  };

  async function post(
    part: Part,
    body: unknown,
    count: number
  ): Promise<PartResult> {
    try {
      const data = await api<{ confirmationCode: string }>(
        `/api/elections/${election.id}/vote/${part}`,
        { json: body }
      );
      return { ok: true, code: data.confirmationCode, count };
    } catch (e) {
      // api() throws the server's message; fetch itself throws a TypeError when offline.
      const error =
        e instanceof Error && !(e instanceof TypeError)
          ? e.message
          : 'Your votes could not be sent. Check your connection and try again.';
      return { ok: false, error, count };
    }
  }

  // Exactly the bodies the website's Ballot sends.
  const sendCandidates = () =>
    post(
      'candidates',
      {
        candidateVotes: answeredPositions.map((p) => ({
          candidateId: candidateVotes[p.position],
          position: p.position
        }))
      },
      answeredPositions.length
    );
  const sendInitiatives = () =>
    post(
      'initiatives',
      {
        initiativeVotes: answeredInitiatives.map((i) => ({
          initiativeId: i.id,
          vote: initiativeVotes[i.id]
        }))
      },
      answeredInitiatives.length
    );

  async function submit() {
    setPending(true);
    const next: typeof results = {};
    if (answeredPositions.length > 0) next.candidates = await sendCandidates();
    if (answeredInitiatives.length > 0)
      next.initiatives = await sendInitiatives();
    setResults(next);
    setPending(false);
    setConfirmOpen(false);
    if (Object.values(next).some((r) => r?.ok)) setSubmittedAt(new Date());
  }

  async function retry(part: Part) {
    setPending(true);
    const result =
      part === 'candidates' ? await sendCandidates() : await sendInitiatives();
    setResults((r) => ({ ...r, [part]: result }));
    setPending(false);
  }

  const failures = (Object.entries(results) as [Part, PartResult][]).filter(
    (entry): entry is [Part, Extract<PartResult, { ok: false }>] => !entry[1].ok
  );

  // ---------------------------------------------------------------- submitted
  if (submittedAt) {
    const row = (label: string, part: Part, of: number) => {
      const r = results[part];
      return (
        <div className="flex flex-col gap-1 border-b py-3 pl-4 pr-3 last:border-b-0">
          <div className="flex items-center gap-3">
            <dt className="min-w-0 flex-1 text-foreground">{label}</dt>
            <dd className="text-muted-foreground">
              {r?.ok
                ? `${r.count} of ${of} answered`
                : r
                  ? 'Not recorded'
                  : `0 of ${of} answered`}
            </dd>
          </div>
          {r?.ok && (
            <dd className="text-caption text-muted-foreground">
              Confirmation code{' '}
              <span className="break-all font-mono text-foreground">
                {r.code}
              </span>
            </dd>
          )}
        </div>
      );
    };
    return (
      <div className="flex min-h-dvh flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)+3rem)]">
        <ResultHeader tone="success" title="Your ballot is in">
          Thank you for voting in the {election.title}. Submitted{' '}
          {formatDeadline(submittedAt)}.
        </ResultHeader>
        {failures.map(([part, r]) => (
          <Banner
            key={part}
            tone="error"
            title={
              part === 'candidates'
                ? 'Your leadership votes were not recorded'
                : 'Your initiative votes were not recorded'
            }
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11"
                disabled={pending}
                onClick={() => retry(part)}
              >
                Try again
              </Button>
            }
          >
            {r.error}
          </Banner>
        ))}
        <dl className="overflow-hidden rounded-lg border bg-card text-sm">
          {positions.length > 0 &&
            row('Leadership positions', 'candidates', positions.length)}
          {initiatives.length > 0 &&
            row('Community initiatives', 'initiatives', initiatives.length)}
          <div className="flex h-13 items-center gap-3 pl-4 pr-3">
            <dt className="min-w-0 flex-1 text-foreground">Results</dt>
            <dd className="text-muted-foreground">After voting closes</dd>
          </div>
        </dl>
        <p className="text-caption text-muted-foreground">
          Your ballot can’t be changed now. If something looks wrong, contact
          BCS Seattle before voting closes on{' '}
          {formatDeadline(election.end_date)}.
        </p>
        <div className="flex-1" />
        <ActionBar>
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => router.replace(`/elections/view/?id=${election.id}`)}
          >
            Back to election
          </Button>
        </ActionBar>
      </div>
    );
  }

  // ---------------------------------------------------------------- review
  if (step === 'review') {
    const skippedNames = [
      ...positions
        .filter((p) => !answeredPositions.includes(p))
        .map((p) => p.position),
      ...initiatives
        .filter((i) => !answeredInitiatives.includes(i))
        .map((i) => i.title)
    ];
    return (
      <>
        <AppHeader title="Review votes" back={{ label: 'Ballot' }} />
        <div className="flex flex-1 flex-col gap-6 px-4 pt-4">
          <p className="text-body text-muted-foreground">
            Check your choices before you submit. Once submitted, your ballot
            can’t be changed.
          </p>
          {failures.length > 0 && (
            <Banner tone="error" title="Your ballot was not recorded">
              {failures.map(([, r]) => r.error).join(' ')} Nothing was counted;
              you can try again.
            </Banner>
          )}
          {blank > 0 && (
            <Banner
              tone="attention"
              title={`${blank} ${blank === 1 ? 'question' : 'questions'} left blank`}
            >
              {skippedNames.join(', ')} {blank === 1 ? 'is' : 'are'} skipped.
              You can still answer {blank === 1 ? 'it' : 'them'} before you
              submit.
            </Banner>
          )}
          {positions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-section text-foreground">
                Leadership positions
              </h2>
              <div className="overflow-hidden rounded-lg border">
                {positions.map((p) => {
                  const id = candidateVotes[p.position];
                  const chosen = id && id !== SKIP;
                  return (
                    <ReviewRow
                      key={p.position}
                      question={p.position}
                      answer={chosen ? candidateName(id) : null}
                      actionLabel={chosen ? 'Change' : 'Answer'}
                      onAction={() => goTo(`q-position-${p.position}`)}
                    />
                  );
                })}
              </div>
            </section>
          )}
          {initiatives.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-section text-foreground">
                Community initiatives
              </h2>
              <div className="overflow-hidden rounded-lg border">
                {initiatives.map((i) => {
                  const vote = initiativeVotes[i.id];
                  return (
                    <ReviewRow
                      key={i.id}
                      question={i.title}
                      answer={
                        vote
                          ? INITIATIVE_CHOICES.find((c) => c.value === vote)
                              ?.label
                          : null
                      }
                      actionLabel={vote ? 'Change' : 'Answer'}
                      onAction={() => goTo(`q-initiative-${i.id}`)}
                    />
                  );
                })}
              </div>
            </section>
          )}
          {answered === 0 && (
            <p className="text-caption text-muted-foreground">
              Answer at least one question to submit.
            </p>
          )}
          <div className="flex-1" />
          <ActionBar
            summary={`${answered} of ${total} answered · ${blank} left blank`}
          >
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={answered === 0}
              onClick={() => setConfirmOpen(true)}
            >
              Submit ballot
            </Button>
          </ActionBar>
        </div>
        <ConfirmSheet
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Submit your ballot?"
          confirmLabel={pending ? 'Submitting…' : 'Submit ballot'}
          cancelLabel="Keep reviewing"
          onConfirm={submit}
          pending={pending}
        >
          You answered {answered} of {total}{' '}
          {total === 1 ? 'question' : 'questions'}.
          {blank > 0 && ' Skipped questions are left blank.'} After you submit,
          you can’t change your ballot.
        </ConfirmSheet>
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
        <PhaseTimeline election={election} phase={d.phase} />
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
                  value={candidateVotes[p.position]}
                  onValueChange={(v) =>
                    setCandidateVotes((s) => ({ ...s, [p.position]: v }))
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
                    setInitiativeVotes((s) => ({ ...s, [i.id]: v }))
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
