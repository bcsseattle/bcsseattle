import { updateFuneralSignup } from '@/utils/supabase/admin';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const {
    fullName,
    email,
    phoneNumber,
    additionalServices,
    additionalComments
  } = await request.json();

  try {
    await updateFuneralSignup({
      fullName,
      email,
      phoneNumber,
      additionalServices,
      additionalComments
    });
    return NextResponse.json({ message: 'Response record sent', status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
