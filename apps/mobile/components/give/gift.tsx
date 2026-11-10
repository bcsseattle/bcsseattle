'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AppHeader } from '~/components/app-header';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';

// What the website's donate wizard offers (components/forms/donate-form.tsx).
export const PRESET_AMOUNTS = ['100', '200', '250', '500'];
export const FREQUENCIES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' }
] as const;
export type Frequency = (typeof FREQUENCIES)[number]['value'];

export const ZELLE_EMAIL = 'billing@bcsseattle.org';
export const CHECK_ADDRESS = '16224 Meadow Rd #502, Lynnwood, WA 98087';
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card', detail: 'Credit or debit card, processed securely by Stripe' },
  { value: 'us_bank_account', label: 'Bank transfer', detail: 'US bank account through Stripe; can take a few days to clear' },
  { value: 'zelle', label: 'Zelle', detail: `Send to ${ZELLE_EMAIL} and add your purpose in the memo` },
  { value: 'check', label: 'Check', detail: `Mail to ${CHECK_ADDRESS}` },
  { value: 'cash', label: 'Cash', detail: 'Contact us to arrange a cash gift' }
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const viaStripe = (method?: string | null) => method === 'card' || method === 'us_bank_account';
export const paidWith = (method?: string | null) => PAYMENT_METHODS.find((m) => m.value === method)?.label ?? 'Other';
export const frequencyLabel = (frequency?: string | null) =>
  FREQUENCIES.find((f) => f.value === frequency)?.label ?? 'One-time';

/** "general-purpose" → "General purpose", as the website's receipt writes it. */
export const purposeLabel = (key?: string | null) => {
  const words = (key || 'general-purpose').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Dollars typed as text to "USD 100.00", or "—" when it isn't an amount yet. */
export const dollars = (amount: string | number) => {
  const cents = Math.round(Number(amount) * 100);
  return Number.isFinite(cents) && cents > 0 ? formatMoney(cents) : '—';
};

/** The query string that carries a chosen gift from Give into the flow, and back for Edit. */
export const giftQuery = (gift: { amount: string; frequency: string; purpose: string }) =>
  new URLSearchParams({ amount: gift.amount, frequency: gift.frequency, purpose: gift.purpose }).toString();

/** The gift summary card from Your information and Payment (Figma 24:2635): what, how much, and Edit. */
export function GiftSummaryRow({ caption, amount, onEdit }: { caption: ReactNode; amount: ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-caption text-muted-foreground">{caption}</span>
        <span className="text-sm font-semibold text-foreground">{amount}</span>
      </div>
      {onEdit && (
        <Button type="button" variant="link" size="lg" className="text-caption font-medium no-underline" onClick={onEdit}>
          Edit<span className="sr-only"> your gift</span>
        </Button>
      )}
    </div>
  );
}

/** Label/value rows in a card-filled group (BCS/List row 13:2112), as on the receipt. */
export function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="overflow-hidden rounded-lg border bg-card text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="flex h-13 items-center gap-3 border-b pl-4 pr-3 last:border-b-0">
          <dt className="min-w-0 flex-1 text-foreground">{term}</dt>
          <dd className="min-w-0 truncate text-right text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A native select at touch height, styled as the Field input: iOS and Android show their own picker. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-md border border-input bg-card pl-2.5 pr-8 text-base text-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/**
 * A screen in the gift flow: the inline header (when `title` is set), then
 * content that fills the height, so the sticky ActionBar it ends with sits
 * at the bottom even when the content is short.
 */
export function FlowScreen({
  title,
  back = {},
  children
}: {
  title?: string;
  back?: { label?: string; href?: string };
  children: ReactNode;
}) {
  return (
    <>
      {title && <AppHeader title={title} back={back} />}
      {/* The child (a form) grows; its ActionBar takes mt-auto. */}
      <div className="flex flex-1 flex-col px-4 pt-4 [&>*]:flex-1">{children}</div>
    </>
  );
}

/** A checkbox with a label and detail; the whole row is the target. */
export function CheckRow({
  checked,
  onChange,
  label,
  detail
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  detail?: ReactNode;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {detail && <span className="text-caption text-muted-foreground">{detail}</span>}
      </span>
    </label>
  );
}

/** Label, control and an error or hint under it (Figma Field 4:24). */
export function FieldRow({
  label,
  htmlFor,
  error,
  hint,
  children
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-caption font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-0 text-caption text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="mt-0 text-caption text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
