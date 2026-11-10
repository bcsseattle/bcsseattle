'use client';

import * as React from 'react';
import Link from 'next/link';

import { SKIP } from '@/components/elections/ballot-position';
import { INITIATIVE_CHOICES, type InitiativeVote } from '@/components/elections/initiative-card';
import { ReviewRow } from '@/components/elections/review-row';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { ResultHeader } from '@/components/ui/result-header';
import { formatDeadline } from '@/utils/format';

export type BallotPart = 'candidates' | 'initiatives';
export type BallotPositionData = {
  position: string;
  description?: string | null;
  candidates: { id: string; name: string; detail?: string | null }[];
};
export type BallotInitiativeData = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
};
/** Posts one part to /api/elections/{id}/vote/{part}: the website with fetch, the app with its token. */
export type SendBallotPart = (
  part: BallotPart,
  body: unknown
) => Promise<{ ok: true; code: string } | { ok: false; error: string }>;
type PartResult = { ok: true; code: string; count: number } | { ok: false; error: string; count: number };

/**
 * A ballot's answers and its submission (plan, Decision 1). Submitting posts
 * the two parts to their existing endpoints, candidates first, then
 * initiatives, each only when it has answers; each endpoint keeps all of its
 * own checks. If one part fails the screen says so and offers to send that
 * part again; the endpoint refuses a second vote on a part that went through,
 * so a retry is safe.
 */
export function useBallot({
  positions,
  initiatives,
  send,
  step
}: {
  positions: BallotPositionData[];
  initiatives: BallotInitiativeData[];
  send: SendBallotPart;
  /** Which screen shows, so Change/Answer can focus its question once the ballot is back. */
  step: string;
}) {
  const [candidateVotes, setCandidateVotes] = React.useState<Record<string, string>>({});
  const [initiativeVotes, setInitiativeVotes] = React.useState<Record<string, InitiativeVote>>({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [results, setResults] = React.useState<Partial<Record<BallotPart, PartResult>>>({});
  const [submittedAt, setSubmittedAt] = React.useState<Date | null>(null);
  const [focusQuestion, setFocusQuestion] = React.useState<string | null>(null);

  const answeredPositions = positions.filter((p) => candidateVotes[p.position] && candidateVotes[p.position] !== SKIP);
  const answeredInitiatives = initiatives.filter((i) => initiativeVotes[i.id]);
  const total = positions.length + initiatives.length;
  const answered = answeredPositions.length + answeredInitiatives.length;

  // Change / Answer on the review screen go back to that question.
  React.useEffect(() => {
    if (step !== 'ballot' || !focusQuestion) return;
    const el = document.getElementById(focusQuestion);
    el?.scrollIntoView({ block: 'center' });
    (el?.querySelector('[role="radio"]') as HTMLElement | null)?.focus({ preventScroll: true });
    setFocusQuestion(null);
  }, [step, focusQuestion]);

  async function post(part: BallotPart, body: unknown, count: number): Promise<PartResult> {
    return { ...(await send(part, body)), count };
  }

  // The bodies the vote endpoints expect.
  const sendCandidates = () =>
    post(
      'candidates',
      {
        candidateVotes: answeredPositions.map((p) => ({ candidateId: candidateVotes[p.position], position: p.position }))
      },
      answeredPositions.length
    );
  const sendInitiatives = () =>
    post(
      'initiatives',
      { initiativeVotes: answeredInitiatives.map((i) => ({ initiativeId: i.id, vote: initiativeVotes[i.id] })) },
      answeredInitiatives.length
    );

  /** Sends both parts; submittedAt is set once at least one went through. */
  async function submit() {
    setPending(true);
    const next: typeof results = {};
    if (answeredPositions.length > 0) next.candidates = await sendCandidates();
    if (answeredInitiatives.length > 0) next.initiatives = await sendInitiatives();
    setResults(next);
    setPending(false);
    setConfirmOpen(false);
    if (Object.values(next).some((r) => r?.ok)) setSubmittedAt(new Date());
  }

  async function retry(part: BallotPart) {
    setPending(true);
    const result = part === 'candidates' ? await sendCandidates() : await sendInitiatives();
    setResults((r) => ({ ...r, [part]: result }));
    setPending(false);
  }

  return {
    positions,
    initiatives,
    candidateVotes,
    setCandidateVotes,
    initiativeVotes,
    setInitiativeVotes,
    answeredPositions,
    answeredInitiatives,
    total,
    answered,
    blank: total - answered,
    candidateName: (id: string) => positions.flatMap((p) => p.candidates).find((c) => c.id === id)?.name ?? '',
    confirmOpen,
    setConfirmOpen,
    pending,
    results,
    failures: (Object.entries(results) as [BallotPart, PartResult][]).filter(
      (entry): entry is [BallotPart, Extract<PartResult, { ok: false }>] => !entry[1].ok
    ),
    submittedAt,
    submit,
    retry,
    focusQuestion,
    focus: setFocusQuestion
  };
}

export type BallotState = ReturnType<typeof useBallot>;

/**
 * Review votes (Figma 25:2792) below the screen's own heading, and the
 * Submit ballot sheet (25:2931). `goTo` returns to a question on the ballot.
 */
export function BallotReview({
  ballot: b,
  goTo,
  headingLevel: Heading,
  hintAboveBar = false
}: {
  ballot: BallotState;
  goTo: (questionId: string) => void;
  headingLevel: 'h2' | 'h3';
  /** The app keeps "Answer at least one question" above its bottom bar, pushed down by a spacer. */
  hintAboveBar?: boolean;
}) {
  const { positions, initiatives, answered, total, blank } = b;
  const skippedNames = [
    ...positions.filter((p) => !b.answeredPositions.includes(p)).map((p) => p.position),
    ...initiatives.filter((i) => !b.answeredInitiatives.includes(i)).map((i) => i.title)
  ];
  const hint = answered === 0 && (
    <p className="mt-0 text-caption text-muted-foreground">Answer at least one question to submit.</p>
  );
  return (
    <>
      {b.failures.length > 0 && (
        <Banner tone="error" title="Your ballot was not recorded">
          {b.failures.map(([, r]) => r.error).join(' ')} Nothing was counted; you can try again.
        </Banner>
      )}
      {blank > 0 && (
        <Banner tone="attention" title={`${blank} ${blank === 1 ? 'question' : 'questions'} left blank`}>
          {skippedNames.join(', ')} {blank === 1 ? 'is' : 'are'} skipped. You can still answer{' '}
          {blank === 1 ? 'it' : 'them'} before you submit.
        </Banner>
      )}
      {positions.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading className="text-section text-foreground">Leadership positions</Heading>
          <div className="overflow-hidden rounded-lg border">
            {positions.map((p) => {
              const id = b.candidateVotes[p.position];
              const chosen = id && id !== SKIP;
              return (
                <ReviewRow
                  key={p.position}
                  question={p.position}
                  answer={chosen ? b.candidateName(id) : null}
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
          <Heading className="text-section text-foreground">Community initiatives</Heading>
          <div className="overflow-hidden rounded-lg border">
            {initiatives.map((i) => {
              const vote = b.initiativeVotes[i.id];
              return (
                <ReviewRow
                  key={i.id}
                  question={i.title}
                  answer={vote ? INITIATIVE_CHOICES.find((c) => c.value === vote)?.label : null}
                  actionLabel={vote ? 'Change' : 'Answer'}
                  onAction={() => goTo(`q-initiative-${i.id}`)}
                />
              );
            })}
          </div>
        </section>
      )}
      {hintAboveBar && hint}
      {hintAboveBar && <div className="flex-1" />}
      <ActionBar summary={`${answered} of ${total} answered · ${blank} left blank`}>
        <Button type="button" size="lg" className="w-full" disabled={answered === 0} onClick={() => b.setConfirmOpen(true)}>
          Submit ballot
        </Button>
      </ActionBar>
      {!hintAboveBar && hint}
      <ConfirmSheet
        open={b.confirmOpen}
        onOpenChange={b.setConfirmOpen}
        title="Submit your ballot?"
        confirmLabel={b.pending ? 'Submitting…' : 'Submit ballot'}
        cancelLabel="Keep reviewing"
        onConfirm={b.submit}
        pending={b.pending}
      >
        You answered {answered} of {total} {total === 1 ? 'question' : 'questions'}.
        {blank > 0 && ' Skipped questions are left blank.'} After you submit, you can’t change your ballot.
      </ConfirmSheet>
    </>
  );
}

/**
 * Ballot submitted (Figma 25:3075): what went in, a retry for a part that
 * didn't, and `action` to leave. With `confirmationHref` each part links to
 * its confirmation page (website); without, the code shows inline (app).
 */
export function BallotSubmitted({
  ballot: b,
  electionTitle,
  closesAt,
  confirmationHref,
  action,
  className,
  retryClassName,
  fill = false
}: {
  ballot: BallotState;
  electionTitle: string;
  closesAt: string;
  confirmationHref?: (part: BallotPart, code: string) => string;
  action: React.ReactNode;
  className: string;
  retryClassName?: string;
  /** Push the action to the bottom of a full-height screen (app). */
  fill?: boolean;
}) {
  const row = (label: string, part: BallotPart, of: number) => {
    const r = b.results[part];
    const count = r?.ok ? `${r.count} of ${of} answered` : r ? 'Not recorded' : `0 of ${of} answered`;
    if (confirmationHref) {
      return (
        <div className="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-1 border-b py-2 pl-4 pr-3 last:border-b-0">
          <dt className="min-w-0 flex-1 text-foreground">{label}</dt>
          <dd className="flex items-center gap-3 text-muted-foreground">
            {r?.ok ? (
              <>
                {r.count} of {of} answered
                <Link
                  href={confirmationHref(part, r.code)}
                  className="text-caption font-medium text-accent underline-offset-4 hover:underline"
                >
                  View confirmation<span className="sr-only"> for {label.toLowerCase()}</span>
                </Link>
              </>
            ) : (
              count
            )}
          </dd>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 border-b py-3 pl-4 pr-3 last:border-b-0">
        <div className="flex items-center gap-3">
          <dt className="min-w-0 flex-1 text-foreground">{label}</dt>
          <dd className="text-muted-foreground">{count}</dd>
        </div>
        {r?.ok && (
          <dd className="text-caption text-muted-foreground">
            Confirmation code <span className="break-all font-mono text-foreground">{r.code}</span>
          </dd>
        )}
      </div>
    );
  };
  return (
    <div className={className}>
      <ResultHeader tone="success" title="Your ballot is in">
        Thank you for voting in the {electionTitle}.{b.submittedAt && ` Submitted ${formatDeadline(b.submittedAt)}.`}
      </ResultHeader>
      {b.failures.map(([part, r]) => (
        <Banner
          key={part}
          tone="error"
          title={part === 'candidates' ? 'Your leadership votes were not recorded' : 'Your initiative votes were not recorded'}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={retryClassName}
              disabled={b.pending}
              onClick={() => b.retry(part)}
            >
              Try again
            </Button>
          }
        >
          {r.error}
        </Banner>
      ))}
      <dl className="overflow-hidden rounded-lg border bg-card text-sm">
        {b.positions.length > 0 && row('Leadership positions', 'candidates', b.positions.length)}
        {b.initiatives.length > 0 && row('Community initiatives', 'initiatives', b.initiatives.length)}
        <div className="flex h-13 items-center gap-3 pl-4 pr-3">
          <dt className="min-w-0 flex-1 text-foreground">Results</dt>
          <dd className="text-muted-foreground">After voting closes</dd>
        </div>
      </dl>
      <p className="mt-0 text-caption text-muted-foreground">
        Your ballot can’t be changed now. If something looks wrong, contact BCS Seattle before voting closes on{' '}
        {formatDeadline(closesAt)}.
      </p>
      {fill && <div className="flex-1" />}
      <ActionBar>{action}</ActionBar>
    </div>
  );
}
