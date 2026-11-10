import * as React from 'react';
import { Search } from 'lucide-react';

import { cn } from '@/utils/cn';

/**
 * Art Gallery SearchBar (Figma 6:23): a 44px search field with a search icon
 * (border-strong, radius-lg, card). The library's "/" shortcut hint is left
 * out: the site has no such shortcut. Give it an aria-label.
 */
export const SearchBar = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <div className={cn('relative w-full max-w-[480px]', className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        type="search"
        className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-base text-foreground ring-offset-card placeholder:text-muted-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
        {...props}
      />
    </div>
  )
);
SearchBar.displayName = 'SearchBar';
