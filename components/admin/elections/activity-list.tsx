import * as React from 'react';
import { History } from 'lucide-react';

import { StatePanel } from '@/components/ui/state-panel';
import { formatDeadline } from '@/utils/format';
import type { Tables } from '@/types_db';

const ACTION: Record<string, string> = {
  publish: 'Published the election',
  lock_ballot: 'Locked the ballot',
  cancel: 'Cancelled the election',
  reopen_certification: 'Reopened the certification',
  publish_results: 'Published the results',
  archive: 'Archived the election',
  extend_nomination_end: 'Extended nominations',
  extend_end_date: 'Extended voting',
  extend_candidate_voting_end: 'Extended candidate voting'
};

const SUBJECT: Record<string, string> = {
  elections: 'the election',
  ballot_positions: 'position',
  initiatives: 'initiative',
  candidates: 'candidate',
  nominations: 'nomination',
  initiative_proposals: 'initiative proposal'
};

const FIELD: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  type: 'Type',
  status: 'Status',
  nomination_start: 'Nominations open',
  nomination_end: 'Nominations close',
  start_date: 'Voting opens',
  end_date: 'Voting closes',
  candidate_voting_start: 'Candidate voting opens',
  candidate_voting_end: 'Candidate voting closes',
  enable_separate_voting_periods: 'Separate candidate window',
  show_unopposed_status: 'Elect uncontested positions',
  results_date: 'Results expected',
  eligibility_cutoff: 'Membership cutoff',
  cancel_reason: 'Cancel reason',
  seats: 'Seats',
  display_order: 'Order',
  ballot_order: 'Order',
  additional_info_url: 'Link',
  pass_threshold: 'To pass',
  vacant: 'Vacant',
  unopposed_decision: 'Uncontested',
  full_name: 'Name',
  bio: 'Statement',
  manifesto: 'Platform',
  photo_url: 'Photo',
  withdrawn_at: 'Withdrawn',
  position: 'Position'
};

// Bookkeeping columns that say nothing to a reader.
const HIDDEN = new Set(['id', 'election_id', 'created_at', 'updated_at', 'is_active', 'created_by', 'ballot_position_id', 'settings', 'user_id']);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const show = (v: unknown) =>
  v === null || v === undefined || v === ''
    ? 'empty'
    : typeof v === 'boolean'
      ? v
        ? 'Yes'
        : 'No'
      : typeof v === 'string' && ISO.test(v)
        ? formatDeadline(v)
        : String(v);

/**
 * The election's activity log (election_events): who did what and when,
 * with the reason and each changed field's before and after. Newest first.
 */
export function ActivityList({ events, names }: { events: Tables<'election_events'>[]; names: Map<string, string> }) {
  if (events.length === 0) return <StatePanel icon={History} title="No activity yet" />;
  return (
    <ol className="divide-y">
      {events.map((e) => {
        const before = (e.before ?? {}) as Record<string, unknown>;
        const after = (e.after ?? {}) as Record<string, unknown>;
        const name = (after.title ?? before.title ?? after.full_name ?? before.full_name ?? after.position ?? before.position) as string | undefined;
        const crud = ['insert', 'update', 'delete'].includes(e.action);
        // Election rows say what happened to the election; other rows say what
        // happened to them, also when an admin action (like locking) changed them.
        const what =
          e.subject === 'elections'
            ? crud
              ? { insert: 'Created the draft', update: 'Edited the election', delete: 'Deleted the draft' }[e.action]!
              : (ACTION[e.action] ?? e.action.replace(/_/g, ' '))
            : `${e.action === 'insert' ? 'Added' : e.action === 'delete' ? 'Removed' : 'Changed'} ${SUBJECT[e.subject] ?? e.subject}${name ? ` “${name}”` : ''}`;
        // Only updates list fields: they hold just what changed.
        const changed = Object.keys(after).filter((k) => k in before && !HIDDEN.has(k) && FIELD[k]);
        return (
          <li key={e.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-medium text-foreground">{what}</span>
              <span className="text-caption text-muted-foreground">
                {formatDeadline(e.created_at)} · {e.actor_id ? (names.get(e.actor_id) ?? 'An admin') : 'System or database'}
              </span>
            </div>
            {e.reason && <p className="mt-0 text-sm text-foreground">Reason: {e.reason}</p>}
            {changed.length > 0 && (
              <ul className="m-0 list-none p-0 text-caption text-muted-foreground">
                {changed.map((k) => (
                  <li key={k}>
                    {FIELD[k]}: {show(before[k])} → {show(after[k])}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
