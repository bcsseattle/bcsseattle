import { NextRequest, NextResponse } from 'next/server';
import { nominateCandidate } from '@/utils/elections/handlers';
import { currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';
import { NominateFormSchema } from '@/types';

/**
 * Nominate yourself, as /elections/[id]/nominate does. Multipart form: fullName,
 * position, bio, manifesto and an optional photoFile (already compressed by the
 * app; request bodies are capped at 4.5 MB). nominateCandidate checks the
 * election and stores the photo.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentUser();
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
  const result = await nominateCandidate(parsed.data, id);
  // nominateCandidate answers with a status path (?status=…) or an error path (?error=…).
  if (new URL(result, 'http://localhost').searchParams.has('error')) return fail(redirectError(result));
  return NextResponse.json({ status: 'nominated' });
}
