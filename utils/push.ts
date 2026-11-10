import 'server-only';
import { connect } from 'node:http2';
import { createSign } from 'node:crypto';
import { supabaseAdmin } from '@/utils/supabase/admin';

/**
 * Push notifications to the BCS Seattle app, sent straight to Apple (APNs) for
 * iOS and to Firebase Cloud Messaging for Android, with Node's own crypto and
 * http2 (no SDKs). Each side is skipped until its credentials are set, so
 * nothing here can break the webhook or a cron. Tokens Apple or Google report
 * as dead are deleted.
 *
 * Env (server only):
 *   APNS_KEY (the .p8 contents), APNS_KEY_ID, APPLE_TEAM_ID,
 *   APNS_PRODUCTION=true for App Store and TestFlight builds (sandbox otherwise)
 *   FCM_SERVICE_ACCOUNT (the Firebase service account JSON)
 */

export type PushMessage = { title: string; body: string; /** App route opened on tap, e.g. /elections/view/?id=… */ url?: string };

export const APP_ID = 'org.bcsseattle.app';
const b64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

/** A compact JWS. ES256 needs the raw r||s signature (ieee-p1363), not DER. */
export function signJwt(header: object, claims: object, key: string, alg: 'ES256' | 'RS256') {
  const input = `${b64url(JSON.stringify({ ...header, alg, typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const signature = createSign('SHA256')
    .update(input)
    .sign(alg === 'ES256' ? { key, dsaEncoding: 'ieee-p1363' } : key);
  return `${input}.${b64url(signature)}`;
}

// The .p8 often arrives in an env var with literal "\n"s.
const pem = (value: string) => value.replace(/\\n/g, '\n');

async function sendApns(tokens: string[], message: PushMessage): Promise<string[]> {
  const { APNS_KEY, APNS_KEY_ID, APPLE_TEAM_ID } = process.env;
  if (!tokens.length || !APNS_KEY || !APNS_KEY_ID || !APPLE_TEAM_ID) return [];

  const jwt = signJwt({ kid: APNS_KEY_ID }, { iss: APPLE_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, pem(APNS_KEY), 'ES256');
  const host = process.env.APNS_PRODUCTION === 'true' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';
  const body = JSON.stringify({ aps: { alert: { title: message.title, body: message.body }, sound: 'default' }, url: message.url });
  const client = connect(host);
  const dead: string[] = [];
  try {
    await Promise.all(
      tokens.map(
        (token) =>
          new Promise<void>((resolve) => {
            const request = client.request({
              ':method': 'POST',
              ':path': `/3/device/${token}`,
              authorization: `bearer ${jwt}`,
              'apns-topic': APP_ID,
              'apns-push-type': 'alert',
              'content-type': 'application/json'
            });
            let status = 0;
            let reply = '';
            request.on('response', (headers) => (status = Number(headers[':status'])));
            request.on('data', (chunk) => (reply += chunk));
            request.on('end', () => {
              // 410: the app was removed; BadDeviceToken: a token from the other environment or garbage.
              if (status === 410 || (status === 400 && reply.includes('BadDeviceToken'))) dead.push(token);
              else if (status !== 200) console.error('APNs', status, reply);
              resolve();
            });
            request.on('error', (error) => {
              console.error('APNs', error);
              resolve();
            });
            request.end(body);
          })
      )
    );
  } finally {
    client.close();
  }
  return dead;
}

async function sendFcm(tokens: string[], message: PushMessage): Promise<string[]> {
  if (!tokens.length || !process.env.FCM_SERVICE_ACCOUNT) return [];
  const account = JSON.parse(process.env.FCM_SERVICE_ACCOUNT) as { client_email: string; private_key: string; project_id: string };

  const iat = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {},
    {
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600
    },
    pem(account.private_key),
    'RS256'
  );
  const auth = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!auth.ok) {
    console.error('FCM auth', auth.status, await auth.text());
    return [];
  }
  const { access_token } = (await auth.json()) as { access_token: string };

  const dead: string[] = [];
  await Promise.all(
    tokens.map(async (token) => {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            data: message.url ? { url: message.url } : undefined
          }
        })
      });
      if (response.ok) return;
      const reply = await response.text();
      // UNREGISTERED (404): the app was removed or the token rotated.
      if (response.status === 404 || reply.includes('UNREGISTERED')) dead.push(token);
      else console.error('FCM', response.status, reply);
    })
  );
  return dead;
}

/** Sends to every device of these users; never throws. Returns how many devices were tried and how many dead tokens were removed. */
export async function sendPush(userIds: string[], message: PushMessage) {
  try {
    if (!userIds.length) return { devices: 0, removed: 0 };
    const { data, error } = await supabaseAdmin.from('device_tokens').select('token, platform').in('user_id', userIds);
    if (error) throw error;
    const devices = data ?? [];
    const of = (platform: string) => devices.filter((d) => d.platform === platform).map((d) => d.token);
    const dead = [...(await sendApns(of('ios'), message)), ...(await sendFcm(of('android'), message))];
    if (dead.length) await supabaseAdmin.from('device_tokens').delete().in('token', dead);
    return { devices: devices.length, removed: dead.length };
  } catch (error) {
    console.error('Push', error);
    return { devices: 0, removed: 0 };
  }
}

/** Stripe charge.failed: tell the member whose plan it was (the email goes out separately). */
export async function notifyPaymentFailed(stripeCustomerId: string | null | undefined) {
  if (!stripeCustomerId) return;
  const { data } = await supabaseAdmin.from('customers').select('id').eq('stripe_customer_id', stripeCustomerId).maybeSingle();
  if (!data) return;
  await sendPush([data.id], {
    title: 'Your contribution didn’t go through',
    body: 'Update your payment method to keep your membership active.',
    url: '/more/account/'
  });
}
