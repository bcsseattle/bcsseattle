import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { APP_ID } from '@/utils/app-links';

/**
 * Stripe sends the browser here after Checkout or the customer portal opened
 * from the mobile app. iOS doesn't open universal links on a redirect, so the
 * member taps through to the app's own scheme. The app also refreshes when it
 * comes back to the foreground, and the Stripe webhook records the payment
 * either way, so a member who just closes this tab loses nothing.
 */
const KINDS = ['checkout', 'portal'];
const PASSED_ON = ['kind', 'id', 'canceled'];

type Props = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = { robots: 'noindex' };

export default async function ReturnToApp({ params, searchParams }: Props) {
  const { kind } = await params;
  if (!KINDS.includes(kind)) notFound();

  const query = await searchParams;
  const passed = new URLSearchParams();
  PASSED_ON.forEach((key) => typeof query[key] === 'string' && passed.set(key, query[key] as string));
  const canceled = query.canceled === '1';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <StatePanel
        icon={canceled ? ArrowLeft : CheckCircle}
        headingLevel="h2"
        title={canceled ? 'Nothing was charged' : kind === 'portal' ? 'All set' : 'Thank you'}
        action={
          <a href={`${APP_ID}://return/${kind}?${passed}`} className={buttonVariants({ size: 'lg' })}>
            Return to BCS Seattle
          </a>
        }
      >
        You can go back to the BCS Seattle app now, or close this tab.
      </StatePanel>
    </main>
  );
}
