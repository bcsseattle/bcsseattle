import { NextRequest, NextResponse } from 'next/server';
import { FuneralFundFormSchema } from '@/types';
import { signUpFuneralBurial } from '@/utils/auth-helpers/server';
import { currentUser, fail, unauthorized } from '@/utils/app-api';

/**
 * Programs › Funeral & burial fund: register interest, as the website's
 * /funeral-burials form does (signUpFuneralBurial). JSON body in the form's
 * fields; the website function answers with a redirect path, so its ?error=
 * becomes a 400 with the message.
 */
export async function POST(request: NextRequest) {
  const { user } = await currentUser();
  if (!user) return unauthorized();
  const parsed = FuneralFundFormSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const result = new URL(await signUpFuneralBurial(parsed.data), 'http://localhost').searchParams;
  if (result.has('error')) return fail(result.get('error_description') || result.get('error')!);
  return NextResponse.json({ ok: true });
}
