import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"

// Art Gallery Button (Figma 5:155). Primary is ink and appears once per view;
// every other action is Secondary (outline), Ghost or Link. Destructive is a
// danger outline. Focus/Ring: 2px card gap, 2px accent.
const buttonVariantsRaw = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        outline:
          "border border-input bg-card text-foreground hover:bg-muted",
        // Kept for existing call sites: the library has no filled grey button.
        secondary:
          "border border-input bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "border border-destructive bg-card text-destructive hover:bg-badge-red-bg",
        // A full control-height hit area with no fill or padding.
        link: "text-accent underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-7 gap-1.5 px-2.5 text-xs",
        lg: "h-11 px-5",
        icon: "h-9 w-9",
      },
    },
    compoundVariants: [
      { variant: "link", size: ["default", "sm", "lg"], className: "px-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Merged, so a link-styled <Link className={buttonVariants(...)}> gets the
// variant's padding over the size's (cva alone leaves both classes in).
const buttonVariants = (...args: Parameters<typeof buttonVariantsRaw>) => cn(buttonVariantsRaw(...args))

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariantsRaw> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
