import { NextRequest } from 'next/server';
import { GET as contributionsPdf } from '@/app/(portal)/account/[memberId]/contributions/pdf/route';
import { currentUser, fail, pdfOrError, unauthorized } from '@/utils/app-api';

/**
 * The signed-in member's own contribution receipt for ?taxYear=, as a PDF.
 * The member comes from the token, never the request, then the website's
 * receipt route renders it.
 */
export async function GET(request: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();

  const { data: member } = await supabase.from('members').select('id').eq('user_id', user.id).maybeSingle();
  if (!member) return fail('No membership found for this account.', 404);

  // Problems come back as JSON the app can show, not a redirect (W13).
  return pdfOrError(await contributionsPdf(request, { params: Promise.resolve({ memberId: member.id }) }));
}
