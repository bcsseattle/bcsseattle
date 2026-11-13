import { NextResponse } from 'next/server';
import { currentUser, fail, isActiveMember, unauthorized } from '@/utils/app-api';
import { renderNotionPage } from '@/utils/notion/render';
import { guideBySlug } from '@/utils/programs';

/**
 * Programs › Immigration & resources › one guide, as HTML rendered from Notion
 * exactly as the website's /resources/immigration/[slug] does. Active members
 * only, as on the website; only the listed guides can be fetched.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  if (!(await isActiveMember(supabase, user.id))) return fail('Immigration resources are for active members.', 403);
  const guide = guideBySlug((await params).slug);
  if (!guide) return fail('That guide wasn’t found.', 404);
  // Notion can fail or be unreachable; say so plainly rather than erroring.
  const html = await renderNotionPage(guide.slug).catch((e) => (console.error('notion guide:', e), null));
  if (!html) return fail('This guide isn’t available right now. Please try again later.', 503);
  return NextResponse.json({ title: guide.title, html, membersOnly: guide.membersOnly });
}
