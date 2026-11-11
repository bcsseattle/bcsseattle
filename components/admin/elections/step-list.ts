/** The create/edit steps, in order. A plain module, so server pages can read it too. */
export const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'ballot', label: 'Positions & initiatives' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'settings', label: 'Eligibility & settings' },
  { key: 'review', label: 'Review' }
] as const;
export type StepKey = (typeof STEPS)[number]['key'];
