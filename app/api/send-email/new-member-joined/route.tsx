import NewMemberJoinedTemplate from '@/components/email-templates/new-member-joined-template';
import { NextRequest } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { email, fullName } = await request.json();
  
  // Fallback name if fullName is undefined or empty
  const displayName = fullName && fullName.trim() ? fullName : email?.split('@')[0] || 'New Member';
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'info@bcsseattle.org',
      to: ['admin@bcsseattle.org'],
      subject: `New Member Registration: ${displayName}`,
      react: <NewMemberJoinedTemplate name={displayName} email={email} />
    });

    if (error) {
      console.log(error);
      return Response.json({ error }, { status: 401 });
    }

    return Response.json(data);
  } catch (error) {
    console.log(error);
    return Response.json({ error }, { status: 404 });
  }
}
