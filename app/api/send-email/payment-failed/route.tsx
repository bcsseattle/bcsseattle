import { PaymentFailedTemplate } from '@/components/email-templates/payment-failed-template';
import { NextRequest } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  debugger;
  const { email, name, amount, retryUrl, failureMessage } =
    await request.json();
  try {
    const { data, error } = await resend.emails.send({
      from: 'info@bcsseattle.org',
      to: [email],
      subject: `BCS Seattle: Payment Failed`,
      react: (
        <PaymentFailedTemplate
          name={name}
          amount={amount}
          retryUrl={retryUrl}
          failureMessage={failureMessage}
        />
      )
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
