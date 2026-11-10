import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"

// Art Gallery Badge (Figma 7:157): a tonal label, 20px, Micro/Semibold.
// Status is never colour alone: the badge always carries its word.
const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap border px-2 text-micro font-semibold [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        green: "border-badge-green-border bg-badge-green-bg text-badge-green-text",
        orange: "border-badge-orange-border bg-badge-orange-bg text-badge-orange-text",
        blue: "border-badge-blue-border bg-badge-blue-bg text-badge-blue-text",
        purple: "border-badge-purple-border bg-badge-purple-bg text-badge-purple-text",
        red: "border-badge-red-border bg-badge-red-bg text-badge-red-text",
        neutral: "border-badge-neutral-border bg-badge-neutral-bg text-badge-neutral-text",
        money: "border-money-negative-border bg-money-negative-bg text-money-negative-text",
      },
      shape: {
        round: "rounded-full",
        square: "rounded-sm",
      },
    },
    defaultVariants: {
      tone: "neutral",
      shape: "round",
    },
  }
)

// The old shadcn variants, for call sites not yet given a tone.
const legacyTone = {
  default: "neutral",
  secondary: "neutral",
  outline: "neutral",
  destructive: "red",
} as const

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  variant?: keyof typeof legacyTone
}

function Badge({ className, tone, shape, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ tone: tone ?? (variant ? legacyTone[variant] : undefined), shape }),
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
