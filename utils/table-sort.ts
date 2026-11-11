export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base'
});

/** Compare raw values so amounts and dates do not sort by their display formatting. */
export function compareSortValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}
