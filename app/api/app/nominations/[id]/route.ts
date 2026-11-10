import { NextRequest, NextResponse } from 'next/server';
import { currentUser, fail, unauthorized } from '@/utils/app-api';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { dbMessage, uploadCandidatePhoto } from '@/utils/elections/photos';

/**
 * Answer or withdraw a nomination from the app, as the website's nomination
 * page does. Multipart form: action (accept, decline or withdraw) and, to
 * accept, fullName, bio, manifesto and an optional photoFile. The nomination
 * functions check that the caller is the nominee (or, to withdraw, the
 * nominator) and that the ballot isn't locked.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  if (!(await checkFeatureFlag('enableElectionManagement'))) return fail('Nominations are handled on the website.', 404);

  const { id } = await params;
  const form = await request.formData().catch(() => null);
  const action = String(form?.get('action') ?? '');
  const field = (name: string) => String(form?.get(name) ?? '').trim() || undefined;

  if (action === 'withdraw') {
    const { error } = await supabase.rpc('nomination_withdraw', { p_nomination: id });
    return error ? fail(dbMessage(error)) : NextResponse.json({ status: 'withdrawn' });
  }
  if (action !== 'accept' && action !== 'decline') return fail('Choose accept, decline or withdraw.');

  let photoUrl: string | undefined;
  const photo = form?.get('photoFile');
  if (action === 'accept' && photo instanceof Blob && photo.size > 0) {
    const file = new File([photo], 'photo.jpg', { type: (photo as Blob).type });
    const uploaded = await uploadCandidatePhoto(supabase, user.id, file);
    if ('error' in uploaded) return fail(uploaded.error);
    photoUrl = uploaded.url;
  }
  const { error } = await supabase.rpc('nomination_respond', {
    p_nomination: id,
    p_accept: action === 'accept',
    p_full_name: field('fullName'),
    p_bio: field('bio'),
    p_manifesto: field('manifesto'),
    p_photo_url: photoUrl
  });
  if (error) return fail(dbMessage(error));
  return NextResponse.json({ status: action === 'accept' ? 'accepted' : 'declined' });
}
