import { NextRequest, NextResponse } from 'next/server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { registerMember } from '@/utils/membership/handlers';
import { currentUser, fail, redirectError, unauthorized } from '@/utils/app-api';

/**
 * Apply for membership, as the /register form does. registerMember validates
 * the details, saves them as pending approval and emails the admins.
 */
export async function POST(request: NextRequest) {
  const { user } = await currentUser();
  if (!user) return unauthorized();

  const values = await request.json().catch(() => null);
  try {
    // On failure it returns an error path; on success it redirects (throws).
    const errorPath = await registerMember(values);
    return fail(errorPath ? redirectError(errorPath) : 'Your application could not be saved.');
  } catch (error) {
    if (isRedirectError(error)) return NextResponse.json({ status: 'pending' });
    throw error;
  }
}
