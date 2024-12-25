import twilio, { Twilio } from 'twilio';

let twilioClient: Twilio | null = null;

export function getTwilio(): Twilio {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials');
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}
