import { WelcomeEmailTemplate } from '@/components/email-templates/membership-template';
import { NextRequest } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  try {
    const { data, error } = await resend.emails.send({
      from: 'info@bcsseattle.org',
      to: [email],
      subject: 'Welcome to BCS Seattle',
      react: <WelcomeEmailTemplate />
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
