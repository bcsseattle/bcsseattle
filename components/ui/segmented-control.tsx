'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '@/utils/cn';

/**
 * Art Gallery Segmented control (Figma 5:213): two to four options on a
 * surface-muted track; the pressed one is card with Shadow/Card SM. It is a
 * single choice, so it is a radio group (arrow keys move the choice). Give it
 * an aria-label or aria-labelledby.
 */
const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>, 'children'> & {
    options: { value: string; label: React.ReactNode }[];
  }
>(({ className, options, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    orientation="horizontal"
    className={cn('inline-flex max-w-full gap-0.5 rounded-md bg-muted p-0.5', className)}
    {...props}
  >
    {options.map((option) => (
      <RadioGroupPrimitive.Item
        key={option.value}
        value={option.value}
        className="flex h-6 items-center whitespace-nowrap rounded-sm px-2 text-caption font-medium text-muted-foreground ring-offset-card transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm"
      >
        {option.label}
      </RadioGroupPrimitive.Item>
    ))}
  </RadioGroupPrimitive.Root>
));
SegmentedControl.displayName = 'SegmentedControl';

export { SegmentedControl };
