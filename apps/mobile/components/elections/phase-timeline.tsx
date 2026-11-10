import {
  TransactionStep,
  TransactionSteps
} from '@/components/ui/transaction-step';
import { formatDate, formatDeadline } from '@/utils/format';
import type { Election, electionPhase } from '~/components/elections/election';

/** The election's phases (TransactionStep, Figma 11:1196), as on the website's detail page. */
export function PhaseTimeline({
  election: e,
  phase: p
}: {
  election: Election;
  phase: ReturnType<typeof electionPhase>;
}) {
  const now = Date.now();
  const upcoming = now < Date.parse(e.start_date);
  return (
    <TransactionSteps className="rounded-lg border bg-card p-4">
      {e.nomination_start && e.nomination_end && (
        <TransactionStep
          label="Nomination period"
          state={
            p.nominationsOpen
              ? 'current'
              : now > Date.parse(e.nomination_end)
                ? 'done'
                : 'upcoming'
          }
          detail={`${formatDate(e.nomination_start)} – ${formatDate(e.nomination_end)}`}
        />
      )}
      {p.separate && e.candidate_voting_end && (
        <TransactionStep
          label="Candidate voting"
          state={
            p.candidateVotingOpen
              ? 'current'
              : now > Date.parse(p.candidateWindow.end)
                ? 'done'
                : 'upcoming'
          }
          detail={`Closes ${formatDeadline(p.candidateWindow.end)}`}
        />
      )}
      <TransactionStep
        label="Voting period"
        state={p.votingOpen ? 'current' : p.closed ? 'done' : 'upcoming'}
        detail={
          p.votingOpen
            ? `Closes ${formatDeadline(e.end_date)}`
            : upcoming
              ? `Opens ${formatDeadline(e.start_date)}`
              : `Closed ${formatDate(e.end_date)}`
        }
      />
      <TransactionStep
        label="Results"
        state={p.closed ? 'done' : 'upcoming'}
        detail={p.closed ? 'Available now' : 'After voting closes'}
      />
    </TransactionSteps>
  );
}
