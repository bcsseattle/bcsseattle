/**
 * Display formats from the design system: money as "USD 1,000.00", dates as
 * "14 Nov 2026", deadlines as "1 Dec 2026, 23:59 PST". For on-screen text and
 * receipts; SMS and email keep getPriceString (utils/helpers.ts).
 */

const TIME_ZONE = 'America/Los_Angeles';
const MINUS = '−';
const NBSP = ' ';

const moneyFormats = [0, 2].map(
  (digits) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'code',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })
);

/**
 * Cents to "USD 1,000.00". `whole` drops the cents ("USD 6,450") for goals,
 * progress and preset amounts. Negatives get a true minus: "−USD 720.00".
 * A non-breaking space keeps "USD" with its number.
 */
export function formatMoney(cents: number, { whole = false } = {}): string {
  // `|| 0` turns -0 into 0, so a zero total never reads "−USD 0.00".
  return moneyFormats[whole ? 0 : 1]
    .format(cents / 100 || 0)
    .replace('-', MINUS)
    .replace(/USD\s/, `USD${NBSP}`);
}

const dateParts = (date: Date, timeZone: string, withTime: boolean) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
      ...(withTime && { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' })
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );

// A bare "2026-11-14" (a Postgres date) is a calendar day, not UTC midnight:
// read in Seattle time it would land on the 13th.
const isDateOnly = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** "14 Nov 2026", in Seattle time. */
export function formatDate(value: string | number | Date): string {
  const p = dateParts(new Date(value), isDateOnly(value) ? 'UTC' : TIME_ZONE, false);
  return `${p.day} ${p.month} ${p.year}`;
}

/** "1 Dec 2026, 23:59 PST": a moment, with Seattle's zone (PST or PDT). */
export function formatDeadline(value: string | number | Date): string {
  const p = dateParts(new Date(value), TIME_ZONE, true);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.timeZoneName}`;
}
