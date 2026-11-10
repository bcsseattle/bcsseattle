import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/utils/cn"

// Art Gallery Banner (Figma 17:192): page- or section-level message. Tonal
// fill and border, an 18px icon in the tone's text colour, a Body/Semibold
// title and a Caption detail. Errors say what to do next.
const bannerVariants = cva(
  "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-foreground",
  {
    variants: {
      tone: {
        attention: "border-badge-orange-border bg-badge-orange-bg [&_[data-icon]]:text-badge-orange-text",
        info: "border-accent-200 bg-accent-100 [&_[data-icon]]:text-accent",
        error: "border-badge-red-border bg-badge-red-bg [&_[data-icon]]:text-badge-red-text",
        success: "border-badge-green-border bg-badge-green-bg [&_[data-icon]]:text-badge-green-text",
      },
    },
    defaultVariants: { tone: "info" },
  }
)

export interface BannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof bannerVariants> {
  title: React.ReactNode
  /** An optional Secondary small button or link, shown at the right. */
  action?: React.ReactNode
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ className, tone, title, action, children, ...props }, ref) => {
    const Icon = tone === "success" ? CheckCircle2 : AlertCircle
    return (
      <div
        ref={ref}
        // Errors are announced; other banners are ordinary page content.
        role={tone === "error" ? "alert" : undefined}
        className={cn(bannerVariants({ tone }), className)}
        {...props}
      >
        <Icon data-icon aria-hidden className="mt-px size-[18px] shrink-0" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-body font-semibold">{title}</div>
          {children && <div className="text-caption">{children}</div>}
        </div>
        {action && <div className="flex shrink-0 items-center">{action}</div>}
      </div>
    )
  }
)
Banner.displayName = "Banner"

export { Banner, bannerVariants }
