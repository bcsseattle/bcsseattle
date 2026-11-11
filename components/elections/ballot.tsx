'use client';

import * as React from 'react';
import Link from 'next/link';

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
import { ActionBar } from '@/components/ui/action-bar';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatTile } from '@/components/ui/stat-tile';

/**
 * One ballot for an election (plan, Decision 1): leadership positions and
 * initiatives on one page (Figma 11:1114, mobile 17:2284), then Review votes
 * (25:2792), a confirm step (25:2931) and Ballot submitted (25:3075). The
 * review and submitted steps and the submission are shared with the app
 * (ballot-steps.tsx).
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
  const [step, setStep] = React.useState<'ballot' | 'review'>('ballot');

  const send: SendBallotPart = async (part, body) => {
    try {
      const response = await fetch(`/api/elections/${electionId}/vote/${part}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: data.error || 'Your votes could not be recorded.' };
      return { ok: true, code: data.confirmationCode };
    } catch {
      return { ok: false, error: 'Your votes could not be sent. Check your connection and try again.' };
    }
  };
  const b = useBallot({ positions, initiatives, send, step });
  const { candidateVotes, initiativeVotes, answered, total } = b;

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, b.submittedAt]);

  const goTo = (questionId: string) => {
    b.focus(questionId);
    setStep('ballot');
  };

  // ---------------------------------------------------------------- submitted
  if (b.submittedAt) {
    return (
      <BallotSubmitted
        ballot={b}
        electionTitle={electionTitle}
        closesAt={closesAt}
        confirmationHref={(part, code) => `/elections/${electionId}/vote/${part}/confirmation?code=${code}`}
        className="mx-auto flex w-full max-w-[480px] flex-col gap-6 pt-6"
        action={
          <Link href="/elections" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            Back to elections
          </Link>
        }
      />
    );
  }

  // ---------------------------------------------------------------- review
  if (step === 'review') {
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
        <BallotReview ballot={b} goTo={goTo} headingLevel="h3" />
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
                  seats={p.seats}
                  value={candidateVotes[p.position]}
                  onValueChange={(v) => b.setCandidateVotes((s) => ({ ...s, [p.position]: v }))}
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
                  onValueChange={(v) => b.setInitiativeVotes((s) => ({ ...s, [i.id]: v }))}
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
