import type { Tables } from '@/types_db';
import { TransactionStep, TransactionSteps } from '@/components/ui/transaction-step';
import { formatDate, formatDeadline } from '@/utils/format';
import type { VotingWindows } from '@/utils/elections/rules';

/**
 * The election's phases (TransactionStep, Figma 11:1196). The nomination
 * window and when the Candidate voting step shows are passed in: the website
 * and the app still decide those differently (docs/mobile-app-gaps.md W15, W16).
 */
export function PhaseTimeline({
  election: e,
  windows: w,
  nominationsOpen,
  candidateVotingEnd,
  className
}: {
  election: Pick<Tables<'elections'>, 'nomination_start' | 'nomination_end' | 'start_date' | 'end_date'>;
  windows: VotingWindows;
  nominationsOpen: boolean;
  /** Shows the Candidate voting step, closing then. */
  candidateVotingEnd: string | null;
  className?: string;
}) {
  return (
    <TransactionSteps className={className}>
      {e.nomination_start && e.nomination_end && (
        <TransactionStep
          label="Nomination period"
          state={nominationsOpen ? 'current' : w.now > Date.parse(e.nomination_end) ? 'done' : 'upcoming'}
          detail={`${formatDate(e.nomination_start)} – ${formatDate(e.nomination_end)}`}
        />
      )}
      {candidateVotingEnd && (
        <TransactionStep
          label="Candidate voting"
          state={w.candidateVotingOpen ? 'current' : w.now > Date.parse(candidateVotingEnd) ? 'done' : 'upcoming'}
          detail={`Closes ${formatDeadline(candidateVotingEnd)}`}
        />
      )}
      <TransactionStep
        label="Voting period"
        state={w.votingOpen ? 'current' : w.closed ? 'done' : 'upcoming'}
        detail={
          w.votingOpen
            ? `Closes ${formatDeadline(e.end_date)}`
            : w.upcoming
              ? `Opens ${formatDeadline(e.start_date)}`
              : `Closed ${formatDate(e.end_date)}`
        }
      />
      <TransactionStep
        label="Results"
        state={w.closed ? 'done' : 'upcoming'}
        detail={w.closed ? 'Available now' : 'After voting closes'}
      />
    </TransactionSteps>
  );
}
