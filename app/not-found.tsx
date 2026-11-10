import Link from 'next/link';
import SiteShell from '@/components/site/site-shell';
import { Button } from '@/components/ui/button';

// Shown for unknown URLs and notFound() (BUG-049: there was none, so Next's bare default showed).
// It sits above the route groups, so it draws the site frame itself.
export default function NotFound() {
  return (
    <SiteShell>
    <div className="mx-auto max-w-xl py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">The page you were looking for doesn&apos;t exist or has moved.</p>
      <Button asChild>
        <Link href="/">Go to the home page</Link>
      </Button>
    </div>
    </SiteShell>
  );
}
