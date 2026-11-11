/** The create/edit steps, in order. A plain module, so server pages can read it too. */
export const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'ballot', label: 'Positions & initiatives' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'settings', label: 'Eligibility & settings' },
  { key: 'review', label: 'Review' }
] as const;
export type StepKey = (typeof STEPS)[number]['key'];

/**
 * The steps an admin can edit at each status (they match the database's
 * rules, election_guard_timeline and election_guard_ballot):
 * - draft: everything, then Review and Publish
 * - scheduled (published, ballot not locked): everything
 * - ballot_locked: the title and description, and the voting dates and times
 * - afterwards: the title and description
 */
export function editableSteps(status: string): StepKey[] {
  if (status === 'draft') return ['basics', 'ballot', 'timeline', 'settings', 'review'];
  if (status === 'scheduled') return ['basics', 'ballot', 'timeline', 'settings'];
  if (status === 'ballot_locked') return ['basics', 'timeline'];
  return ['basics'];
}
