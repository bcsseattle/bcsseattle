'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AppHeader } from '~/components/app-header';
import { cn } from '@/utils/cn';

/** "general-purpose" → "General purpose", as the website's receipt writes it. */
export const purposeLabel = (key?: string | null) => {
  const words = (key || 'general-purpose').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The query string that carries a chosen gift from Give into the flow, and back for Edit. */
export const giftQuery = (gift: { amount: string; frequency: string; purpose: string }) =>
  new URLSearchParams({ amount: gift.amount, frequency: gift.frequency, purpose: gift.purpose }).toString();

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
