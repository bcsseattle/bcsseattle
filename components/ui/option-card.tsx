'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '@/utils/cn';

/**
 * Art Gallery OptionCard (Figma 62:100): a radio choice drawn as a card with a
 * label, an optional detail and an optional value. The whole card is the
 * target. Selected: accent-100 fill, accent outline, checked radio. Disabled:
 * 50% opacity (say why in the detail). Place inside a RadioGroup.
 */
const OptionCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>, 'children'> & {
    label: React.ReactNode;
    detail?: React.ReactNode;
    value: string;
    /** Shown at the right, e.g. a price or date. */
    trailing?: React.ReactNode;
  }
>(({ className, label, detail, trailing, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'group flex w-full items-center gap-3 rounded-md border border-input bg-card px-4 py-3 text-left ring-offset-card transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent-100 data-[state=checked]:shadow-[inset_0_0_0_0.5px_hsl(var(--accent))]',
      className
    )}
    {...props}
  >
    <span
      aria-hidden
      className="h-4 w-4 shrink-0 rounded-full border border-input bg-card group-data-[state=checked]:border-[5px] group-data-[state=checked]:border-accent"
    />
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {detail && <span className="text-caption text-muted-foreground">{detail}</span>}
    </span>
    {trailing && <span className="shrink-0 text-sm font-medium text-foreground">{trailing}</span>}
  </RadioGroupPrimitive.Item>
));
OptionCard.displayName = 'OptionCard';

export { OptionCard };
