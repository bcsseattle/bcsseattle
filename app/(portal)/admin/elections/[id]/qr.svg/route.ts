import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { eventVoteQr } from '@/utils/elections/event-qr';

/** The event QR code on its own, to show full screen on a projector. Admins only, as results.csv. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()) || !(await checkFeatureFlag('allowGuestVoting'))) {
    return new Response('Not found', { status: 404 });
  }
  const { id } = await params;
  return new Response(await eventVoteQr(id), { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store' } });
}
