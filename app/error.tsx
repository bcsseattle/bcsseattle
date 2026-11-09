'use client';

import { Button } from '@/components/ui/button';

// Errors inside a page keep the site's header and footer (BUG-049); global-error.tsx
// only handles a failure of the root layout itself.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);
  return (
    <div className="mx-auto max-w-xl py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">Please try again. If it keeps happening, contact us.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
