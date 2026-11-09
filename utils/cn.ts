import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge must know the design-system text sizes (tailwind.config.js
// fontSize), or it reads "text-caption" as a colour and drops it next to
// "text-foreground".
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "hero", "doc-title", "doc-lead", "display", "screen", "panel", "figure",
            "section", "item", "body", "table", "caption", "micro", "overline",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
