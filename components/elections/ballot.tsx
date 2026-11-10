'use client';

import * as React from 'react';
import Link from 'next/link';

import { BallotPosition, SKIP } from '@/components/elections/ballot-position';
import { InitiativeCard, INITIATIVE_CHOICES, type InitiativeVote } from '@/components/elections/initiative-card';
import { ReviewRow } from '@/components/elections/review-row';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { ResultHeader } from '@/components/ui/result-header';
import { StatTile } from '@/components/ui/stat-tile';
import { formatDeadline } from '@/utils/format';

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

type PartResult = { ok: true; code: string; count: number } | { ok: false; error: string; count: number };

/**
 * One ballot for an election (plan, Decision 1): leadership positions and
 * initiatives on one page (Figma 11:1114, mobile 17:2284), then Review votes
 * (25:2792), a confirm step (25:2931) and Ballot submitted (25:3075).
 *
 * Submitting posts to the two existing endpoints, candidates first, then
 * initiatives, each only when it has answers. Each endpoint keeps all of its
 * own checks (voting window, active member, already voted, valid choices).
 * The two are separate requests: if one fails, the screen says so and offers
 * to send that part again; the endpoint refuses a second vote on a part that
 * went through, so a retry is safe.
 */
export function Ballot({
  electionId,
  electionTitle,
  closesAt,
  positions,
  initiatives
}: {
  electionId: string;
  electionTitle: string;
  closesAt: string;
  positions: BallotPositionData[];
  initiatives: BallotInitiativeData[];
}) {
  const [step, setStep] = React.useState<'ballot' | 'review' | 'submitted'>('ballot');
  const [candidateVotes, setCandidateVotes] = React.useState<Record<string, string>>({});
  const [initiativeVotes, setInitiativeVotes] = React.useState<Record<string, InitiativeVote>>({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [results, setResults] = React.useState<{ candidates?: PartResult; initiatives?: PartResult }>({});
  const [submittedAt, setSubmittedAt] = React.useState<Date | null>(null);
  const [focusQuestion, setFocusQuestion] = React.useState<string | null>(null);

  const candidateName = (id: string) =>
    positions.flatMap((p) => p.candidates).find((c) => c.id === id)?.name ?? '';
  const answeredPositions = positions.filter((p) => candidateVotes[p.position] && candidateVotes[p.position] !== SKIP);
  const answeredInitiatives = initiatives.filter((i) => initiativeVotes[i.id]);
  const total = positions.length + initiatives.length;
  const answered = answeredPositions.length + answeredInitiatives.length;
  const blank = total - answered;
  const deadline = formatDeadline(closesAt);

  // Change / Answer on the review screen go back to that question.
  React.useEffect(() => {
    if (step !== 'ballot' || !focusQuestion) return;
    const el = document.getElementById(focusQuestion);
    el?.scrollIntoView({ block: 'center' });
    (el?.querySelector('[role="radio"]') as HTMLElement | null)?.focus({ preventScroll: true });
    setFocusQuestion(null);
  }, [step, focusQuestion]);

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const goTo = (questionId: string) => {
    setFocusQuestion(questionId);
    setStep('ballot');
  };

  async function post(path: 'candidates' | 'initiatives', body: unknown, count: number): Promise<PartResult> {
    try {
      const response = await fetch(`/api/elections/${electionId}/vote/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: data.error || 'Your votes could not be recorded.', count };
      return { ok: true, code: data.confirmationCode, count };
    } catch {
      return { ok: false, error: 'Your votes could not be sent. Check your connection and try again.', count };
    }
  }

  // The same request bodies the per-part ballots send.
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

  async function submit() {
    setPending(true);
    const next: typeof results = {};
    if (answeredPositions.length > 0) next.candidates = await sendCandidates();
    if (answeredInitiatives.length > 0) next.initiatives = await sendInitiatives();
    setResults(next);
    setPending(false);
    setConfirmOpen(false);
    if (Object.values(next).some((r) => r?.ok)) {
      setSubmittedAt(new Date());
      setStep('submitted');
    }
  }

  async function retry(part: 'candidates' | 'initiatives') {
    setPending(true);
    const result = part === 'candidates' ? await sendCandidates() : await sendInitiatives();
    setResults((r) => ({ ...r, [part]: result }));
    setPending(false);
  }

  const failures = Object.entries(results).filter(([, r]) => r && !r.ok) as [string, Extract<PartResult, { ok: false }>][];

  // ---------------------------------------------------------------- submitted
  if (step === 'submitted') {
    const row = (label: string, part: 'candidates' | 'initiatives', of: number) => {
      const r = results[part];
      return (
        <div className="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-1 border-b py-2 pl-4 pr-3 last:border-b-0">
          <dt className="min-w-0 flex-1 text-foreground">{label}</dt>
          <dd className="flex items-center gap-3 text-muted-foreground">
            {r?.ok ? (
              <>
                {r.count} of {of} answered
                <Link
                  href={`/elections/${electionId}/vote/${part}/confirmation?code=${r.code}`}
                  className="text-caption font-medium text-accent underline-offset-4 hover:underline"
                >
                  View confirmation<span className="sr-only"> for {label.toLowerCase()}</span>
                </Link>
              </>
            ) : r ? (
              'Not recorded'
            ) : (
              `0 of ${of} answered`
            )}
          </dd>
        </div>
      );
    };
    return (
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 pt-6">
        <ResultHeader tone="success" title="Your ballot is in">
          Thank you for voting in the {electionTitle}.{submittedAt && ` Submitted ${formatDeadline(submittedAt)}.`}
        </ResultHeader>
        {failures.map(([part, r]) => (
          <Banner
            key={part}
            tone="error"
            title={part === 'candidates' ? 'Your leadership votes were not recorded' : 'Your initiative votes were not recorded'}
            action={
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => retry(part as 'candidates' | 'initiatives')}>
                Try again
              </Button>
            }
          >
            {r.error}
          </Banner>
        ))}
        <dl className="overflow-hidden rounded-lg border bg-card text-sm">
          {positions.length > 0 && row('Leadership positions', 'candidates', positions.length)}
          {initiatives.length > 0 && row('Community initiatives', 'initiatives', initiatives.length)}
          <div className="flex h-13 items-center gap-3 pl-4 pr-3">
            <dt className="min-w-0 flex-1 text-foreground">Results</dt>
            <dd className="text-muted-foreground">After voting closes</dd>
          </div>
        </dl>
        <p className="mt-0 text-caption text-muted-foreground">
          Your ballot can’t be changed now. If something looks wrong, contact BCS Seattle before voting closes on{' '}
          {deadline}.
        </p>
        <ActionBar>
          <Link href="/elections" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            Back to elections
          </Link>
        </ActionBar>
      </div>
    );
  }

  // ---------------------------------------------------------------- review
  if (step === 'review') {
    const skippedNames = [
      ...positions.filter((p) => !answeredPositions.includes(p)).map((p) => p.position),
      ...initiatives.filter((i) => !answeredInitiatives.includes(i)).map((i) => i.title)
    ];
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Button type="button" variant="ghost" size="sm" className="-ml-2.5 self-start" onClick={() => setStep('ballot')}>
            ← Back to ballot
          </Button>
          <h2 className="text-screen text-foreground">Review votes</h2>
          <p className="mt-0 text-sm text-muted-foreground">
            Check your choices before you submit. Once submitted, your ballot can’t be changed.
          </p>
        </div>
        {failures.length > 0 && (
          <Banner tone="error" title="Your ballot was not recorded">
            {failures.map(([, r]) => r.error).join(' ')} Nothing was counted; you can try again.
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
            <h3 className="text-section text-foreground">Leadership positions</h3>
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
            <h3 className="text-section text-foreground">Community initiatives</h3>
            <div className="overflow-hidden rounded-lg border">
              {initiatives.map((i) => {
                const vote = initiativeVotes[i.id];
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
        <ActionBar summary={`${answered} of ${total} answered · ${blank} left blank`}>
          <Button type="button" size="lg" className="w-full" disabled={answered === 0} onClick={() => setConfirmOpen(true)}>
            Submit ballot
          </Button>
        </ActionBar>
        {answered === 0 && (
          <p className="mt-0 text-caption text-muted-foreground">Answer at least one question to submit.</p>
        )}
        <ConfirmSheet
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Submit your ballot?"
          confirmLabel={pending ? 'Submitting…' : 'Submit ballot'}
          cancelLabel="Keep reviewing"
          onConfirm={submit}
          pending={pending}
        >
          You answered {answered} of {total} {total === 1 ? 'question' : 'questions'}.
          {blank > 0 && ' Skipped questions are left blank.'} After you submit, you can’t change your ballot.
        </ConfirmSheet>
      </div>
    );
  }

  // ---------------------------------------------------------------- ballot
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        {positions.length > 0 && (
          <>
            <h2 className="text-overline uppercase text-muted-foreground">Leadership positions</h2>
            {positions.map((p) => (
              <div key={p.position} id={`q-position-${p.position}`} className="scroll-mt-20">
                <BallotPosition
                  position={p.position}
                  description={p.description}
                  candidates={p.candidates}
                  value={candidateVotes[p.position]}
                  onValueChange={(v) => setCandidateVotes((s) => ({ ...s, [p.position]: v }))}
                />
              </div>
            ))}
          </>
        )}
        {initiatives.length > 0 && (
          <>
            <h2 className="mt-2 text-overline uppercase text-muted-foreground">Community initiatives</h2>
            {initiatives.map((i) => (
              <div key={i.id} id={`q-initiative-${i.id}`} className="scroll-mt-20">
                <InitiativeCard
                  title={i.title}
                  description={i.description}
                  moreInfoUrl={i.url}
                  value={initiativeVotes[i.id]}
                  onValueChange={(v) => setInitiativeVotes((s) => ({ ...s, [i.id]: v }))}
                  // The ids the initiative ballot form already uses.
                  optionId={(v) => `${v}-${i.id}`}
                />
              </div>
            ))}
          </>
        )}
      </div>
      {/* Below lg the aside is display: contents, so the ActionBar sticks across the whole ballot. */}
      <aside aria-label="Your ballot" className="flex flex-col gap-3 max-lg:contents lg:sticky lg:top-6 lg:self-start">
        <StatTile
          label="Your ballot"
          value={`${answered} of ${total} answered`}
          note="Skip anything you are unsure about."
          className="max-lg:hidden"
        />
        <ActionBar summary={<span className="lg:hidden">{`${answered} of ${total} answered`}</span>}>
          <Button type="button" size="lg" className="w-full" onClick={() => setStep('review')}>
            Review votes
          </Button>
        </ActionBar>
        <p className="mt-0 text-caption text-muted-foreground">
          You will see every choice before you submit. Once submitted, your ballot can’t be changed.
        </p>
      </aside>
    </div>
  );
}
