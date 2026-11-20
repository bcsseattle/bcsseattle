/**
 * One line of an expense's breakdown (its costs, or the income of the event it
 * paid for). `amount` is in cents, like expenses.amount. Items sharing a
 * `group` ("Venue", "Items purchased by Qazi") are shown under a subtotal.
 */
export type ExpenseItem = { label: string; amount: number; group?: string };

// "Venue Rental Room 1<tab>$575.00", "Kabob Korner 1,500", "Deposit refund: -200".
// The label is everything before the last number on the line.
const LINE = /^(.+?)[\s,:]+([-−])?\s*\$?\s*(\d[\d,]*(?:\.\d{1,2})?)$/;
// "Venue:" starts a group. The colon is required so an item whose amount was
// forgotten is reported rather than quietly becoming a heading.
const HEADING = /^(.+?)\s*:$/;

/**
 * Reads a breakdown typed or pasted one item per line (two columns copied from
 * a spreadsheet paste this way). A line ending in a colon heads a group for
 * the items after it. Lines it can't read come back in `bad`.
 * A leading minus makes a credit, e.g. a deposit that was refunded.
 */
export function parseExpenseItems(text: string): { items: ExpenseItem[]; bad: string[] } {
  const items: ExpenseItem[] = [];
  const bad: string[] = [];
  let group: string | undefined;
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const match = LINE.exec(line);
    const label = (match ?? HEADING.exec(line))?.[1].trim() ?? '';
    if (!label || label.length > 100) {
      bad.push(line);
    } else if (match) {
      const cents = Math.round(Number(match[3].replace(/,/g, '')) * 100);
      items.push({ label, amount: match[2] ? -cents : cents, ...(group && { group }) });
    } else {
      group = label;
    }
  }
  return { items, bad };
}

/** Items back as the text parseExpenseItems reads, for the edit form. */
export function formatExpenseItems(items: ExpenseItem[]): string {
  return groupExpenseItems(items)
    .flatMap((g) => [...(g.group ? [`${g.group}:`] : []), ...g.items.map((i) => `${i.label}  ${(i.amount / 100).toFixed(2)}`)])
    .join('\n');
}

/** Items by group, in order of first appearance, ungrouped ones first (as parsing leaves them). */
export function groupExpenseItems(items: ExpenseItem[]): { group: string; items: ExpenseItem[]; subtotal: number }[] {
  const groups = new Map<string, ExpenseItem[]>(items.some((i) => !i.group) ? [['', []]] : []);
  for (const item of items) groups.set(item.group ?? '', [...(groups.get(item.group ?? '') ?? []), item]);
  return Array.from(groups, ([group, members]) => ({ group, items: members, subtotal: sumExpenseItems(members) }));
}

export const sumExpenseItems = (items: ExpenseItem[]) => items.reduce((sum, i) => sum + i.amount, 0);

/** A breakdown stored on an expense row (a jsonb column), or [] when it has none. */
export function expenseItems(value: unknown): ExpenseItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is ExpenseItem =>
      typeof i?.label === 'string' && typeof i?.amount === 'number' && (i.group === undefined || typeof i.group === 'string')
  );
}
