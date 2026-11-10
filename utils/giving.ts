/**
 * What a gift and a fundraiser are, in words and numbers, for the website and
 * the app alike. Plain values only: no server imports, so the app can use them.
 */
import type { Fundraiser } from '@/types';
import { formatMoney } from '@/utils/format';

// ---- fundraisers

/** "emergency" → "Emergency": the category on the card, the tabs and the detail. */
export const categoryLabel = (category?: string | null) =>
  category ? category.charAt(0).toUpperCase() + category.slice(1) : null;

/** Raised as a share of the goal, 0–100. */
export const percentRaised = (f: Pick<Fundraiser, 'current_amount' | 'goal_amount'>) =>
  Math.min(100, ((f.current_amount ?? 0) / f.goal_amount) * 100);

/** Open for gifts: active and not past its end date. No end date means open-ended (BUG-038). */
export const isOpen = (f: Pick<Fundraiser, 'status' | 'ends_at'>) =>
  f.status === 'active' && !(f.ends_at && new Date(f.ends_at) < new Date());

// ---- the donate wizard

export type Frequency = 'one_time' | 'month' | 'year';
export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'one_time', label: 'One-time' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' }
];
export const PRESET_AMOUNTS = ['100', '200', '250', '500'];

export const ZELLE_EMAIL = 'billing@bcsseattle.org';
export const CHECK_ADDRESS = '16224 Meadow Rd #502, Lynnwood, WA 98087';

export type PaymentMethod = 'card' | 'us_bank_account' | 'zelle' | 'check' | 'cash';
export const PAYMENT_METHODS: { value: PaymentMethod; label: string; detail: string }[] = [
  { value: 'card', label: 'Card', detail: 'Credit or debit card, processed securely by Stripe' },
  { value: 'us_bank_account', label: 'Bank transfer', detail: 'US bank account through Stripe; can take a few days to clear' },
  { value: 'zelle', label: 'Zelle', detail: `Send to ${ZELLE_EMAIL} and add your purpose in the memo` },
  { value: 'check', label: 'Check', detail: `Mail to ${CHECK_ADDRESS}` },
  { value: 'cash', label: 'Cash', detail: 'Contact us to arrange a cash gift' }
];

/** Card and bank transfer are paid in Stripe; Zelle, check and cash are pledges paid outside it. */
export const viaStripe = (method?: string | null) => method === 'card' || method === 'us_bank_account';

/** "Bank transfer" for us_bank_account, as the receipt says; anything else is "Other". */
export const paidWith = (method?: string | null) => PAYMENT_METHODS.find((m) => m.value === method)?.label ?? 'Other';

export const frequencyLabel = (frequency?: string | null) =>
  FREQUENCIES.find((f) => f.value === frequency)?.label ?? 'One-time';

/** Dollars typed as text to "USD 100.00", or "—" while it isn't an amount yet. */
export const dollars = (amount: string | number) => {
  const cents = Math.round(Number(amount) * 100);
  return Number.isFinite(cents) && cents > 0 ? formatMoney(cents) : '—';
};
