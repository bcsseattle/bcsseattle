import { NextRequest, NextResponse } from 'next/server';
import { nominateCandidate } from '@/utils/elections/handlers';
import { currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';
import { NominateFormSchema } from '@/types';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { dbMessage, uploadCandidatePhoto } from '@/utils/elections/photos';

/**
 * Nominate yourself, as /elections/[id]/nominate does. Multipart form: fullName,
 * position (its title), bio, manifesto and an optional photoFile (already
 * compressed by the app; request bodies are capped at 4.5 MB).
 *
 * With enableElectionManagement on, the nomination goes to review
 * (nomination_create) and the reply is { status: 'submitted' }; otherwise
 * nominateCandidate adds the candidate straight away ({ status: 'nominated' }).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  const photo = form?.get('photoFile');
  const parsed = NominateFormSchema.safeParse({
    fullName: form?.get('fullName') ?? '',
    position: form?.get('position') ?? '',
    bio: form?.get('bio') || undefined,
    manifesto: form?.get('manifesto') || undefined,
    photoFile: photo instanceof Blob && photo.size > 0 ? photo : undefined
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { id } = await params;

  if (await checkFeatureFlag('enableElectionManagement')) {
    const { data: position } = await supabase
      .from('ballot_positions')
      .select('id')
      .eq('election_id', id)
      .eq('title', parsed.data.position)
      .maybeSingle();
    if (!position) return fail('Choose a position on this election’s ballot.');
    let photoUrl: string | undefined;
    if (parsed.data.photoFile) {
      const file = parsed.data.photoFile instanceof File ? parsed.data.photoFile : new File([parsed.data.photoFile], 'photo.jpg', { type: parsed.data.photoFile.type });
      const uploaded = await uploadCandidatePhoto(supabase, user.id, file);
      if ('error' in uploaded) return fail(uploaded.error);
      photoUrl = uploaded.url;
    }
    const { error } = await supabase.rpc('nomination_create', {
      p_election: id,
      p_position: position.id,
      p_nominee: user.id,
      p_full_name: parsed.data.fullName,
      p_bio: parsed.data.bio,
      p_manifesto: parsed.data.manifesto,
      p_photo_url: photoUrl
    });
    if (error) return fail(dbMessage(error));
    return NextResponse.json({ status: 'submitted' });
  }

  const result = await nominateCandidate(parsed.data, id);
  // nominateCandidate answers with a status path (?status=…) or an error path (?error=…).
  if (new URL(result, 'http://localhost').searchParams.has('error')) return fail(redirectError(result));
  return NextResponse.json({ status: 'nominated' });
}
