/**
 * utils/push.ts: JWT signing for APNs (ES256) and Google (RS256), sending to
 * both platforms, removing tokens Apple or Google call dead, and skipping a
 * platform whose credentials aren't set.
 */
import { EventEmitter } from 'node:events';
import { generateKeyPairSync, createVerify, type KeyObject } from 'node:crypto';

const db = {
  devices: [] as { token: string; platform: string }[],
  customer: null as { id: string } | null,
  deleted: [] as string[]
};
jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        in: async () => ({ data: db.devices, error: null }),
        eq: () => ({ maybeSingle: async () => ({ data: table === 'customers' ? db.customer : null }) })
      }),
      delete: () => ({
        in: async (_column: string, tokens: string[]) => {
          db.deleted.push(...tokens);
          return { error: null };
        }
      })
    })
  }
}));

// APNs over http2: each token answers with the status in `apnsReplies` (200 by default).
const apnsRequests: { headers: Record<string, string>; body: string }[] = [];
const apnsReplies: Record<string, [number, string]> = {};
const apnsHosts: string[] = [];
jest.mock('node:http2', () => ({
  connect: (host: string) => {
    apnsHosts.push(host);
    return {
      close: jest.fn(),
      request: (headers: Record<string, string>) => {
        const request = new EventEmitter() as EventEmitter & { end: (body: string) => void };
        request.end = (body: string) => {
          apnsRequests.push({ headers, body });
          const [status, reply] = apnsReplies[headers[':path'].split('/').pop()!] ?? [200, ''];
          setImmediate(() => {
            request.emit('response', { ':status': status });
            if (reply) request.emit('data', reply);
            request.emit('end');
          });
        };
        return request;
      }
    };
  }
}));

import { notifyPaymentFailed, sendPush, signJwt } from '@/utils/push';

const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = (key: KeyObject) => key.export({ type: 'pkcs8', format: 'pem' }).toString();
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());

let fetchMock: jest.Mock;
beforeEach(() => {
  db.devices = [];
  db.customer = null;
  db.deleted = [];
  apnsRequests.length = 0;
  apnsHosts.length = 0;
  for (const key of Object.keys(apnsReplies)) delete apnsReplies[key];
  process.env.APNS_KEY = pem(ec.privateKey).replace(/\n/g, '\\n'); // as it sits in an env var
  process.env.APNS_KEY_ID = 'KEY123';
  process.env.APPLE_TEAM_ID = 'TEAM123';
  delete process.env.APNS_PRODUCTION;
  process.env.FCM_SERVICE_ACCOUNT = JSON.stringify({
    client_email: 'push@bcs.iam.gserviceaccount.com',
    private_key: pem(rsa.privateKey),
    project_id: 'bcs-app'
  });
  fetchMock = jest.fn(async (url: string, init: { body: string }) => {
    if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 'ya29.token' }));
    const token = JSON.parse(init.body).message.token;
    return token === 'android-dead'
      ? new Response('{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}', { status: 404 })
      : new Response('{}');
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('signJwt', () => {
  it('signs ES256 in the raw r||s form APNs expects', () => {
    const jwt = signJwt({ kid: 'K' }, { iss: 'T', iat: 1 }, pem(ec.privateKey), 'ES256');
    const [header, claims, signature] = jwt.split('.');
    expect(decode(header)).toEqual({ kid: 'K', alg: 'ES256', typ: 'JWT' });
    expect(decode(claims)).toEqual({ iss: 'T', iat: 1 });
    expect(Buffer.from(signature, 'base64url')).toHaveLength(64);
    const ok = createVerify('SHA256')
      .update(`${header}.${claims}`)
      .verify({ key: ec.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'));
    expect(ok).toBe(true);
  });

  it('signs RS256 for Google', () => {
    const [header, claims, signature] = signJwt({}, { iss: 'x' }, pem(rsa.privateKey), 'RS256').split('.');
    expect(createVerify('SHA256').update(`${header}.${claims}`).verify(rsa.publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  });
});

describe('sendPush', () => {
  const message = { title: 'Voting is open', body: 'Cast your ballot.', url: '/elections/view/?id=e1' };

  it('sends to iOS through APNs and Android through FCM, and removes dead tokens', async () => {
    db.devices = [
      { token: 'ios-ok', platform: 'ios' },
      { token: 'ios-gone', platform: 'ios' },
      { token: 'android-ok', platform: 'android' },
      { token: 'android-dead', platform: 'android' }
    ];
    apnsReplies['ios-gone'] = [410, '{"reason":"Unregistered"}'];

    expect(await sendPush(['u1'], message)).toEqual({ devices: 4, removed: 2 });
    expect(db.deleted.sort()).toEqual(['android-dead', 'ios-gone']);

    expect(apnsHosts).toEqual(['https://api.sandbox.push.apple.com']);
    const apns = apnsRequests.find((r) => r.headers[':path'] === '/3/device/ios-ok')!;
    expect(apns.headers['apns-topic']).toBe('org.bcsseattle.app');
    expect(apns.headers['apns-push-type']).toBe('alert');
    expect(decode(apns.headers.authorization.replace('bearer ', '').split('.')[1])).toMatchObject({ iss: 'TEAM123' });
    expect(JSON.parse(apns.body)).toEqual({
      aps: { alert: { title: 'Voting is open', body: 'Cast your ballot.' }, sound: 'default' },
      url: '/elections/view/?id=e1'
    });

    const [authUrl, authInit] = fetchMock.mock.calls[0];
    expect(authUrl).toBe('https://oauth2.googleapis.com/token');
    const assertion = new URLSearchParams(authInit.body).get('assertion')!;
    expect(decode(assertion.split('.')[1])).toMatchObject({
      iss: 'push@bcs.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    });
    const send = fetchMock.mock.calls.find(([url]) => url.includes('messages:send'))!;
    expect(send[0]).toBe('https://fcm.googleapis.com/v1/projects/bcs-app/messages:send');
    expect(send[1].headers.authorization).toBe('Bearer ya29.token');
    expect(JSON.parse(send[1].body).message).toMatchObject({
      notification: { title: 'Voting is open', body: 'Cast your ballot.' },
      data: { url: '/elections/view/?id=e1' }
    });
  });

  it('uses production APNs for store builds', async () => {
    process.env.APNS_PRODUCTION = 'true';
    db.devices = [{ token: 'ios-ok', platform: 'ios' }];
    await sendPush(['u1'], message);
    expect(apnsHosts).toEqual(['https://api.push.apple.com']);
  });

  it('skips a platform until its credentials are set, without failing', async () => {
    delete process.env.APNS_KEY;
    delete process.env.FCM_SERVICE_ACCOUNT;
    db.devices = [
      { token: 'ios-ok', platform: 'ios' },
      { token: 'android-ok', platform: 'android' }
    ];
    expect(await sendPush(['u1'], message)).toEqual({ devices: 2, removed: 0 });
    expect(apnsRequests).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    db.devices = [{ token: 'android-ok', platform: 'android' }];
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(sendPush(['u1'], message)).resolves.toEqual({ devices: 0, removed: 0 });
  });
});

describe('notifyPaymentFailed', () => {
  it('tells the member whose Stripe customer it was', async () => {
    db.customer = { id: 'u1' };
    db.devices = [{ token: 'ios-ok', platform: 'ios' }];
    await notifyPaymentFailed('cus_1');
    expect(JSON.parse(apnsRequests[0].body).url).toBe('/more/account/');
  });

  it('does nothing for a charge with no customer, or an unknown one', async () => {
    db.devices = [{ token: 'ios-ok', platform: 'ios' }];
    await notifyPaymentFailed(null);
    await notifyPaymentFailed('cus_unknown');
    expect(apnsRequests).toHaveLength(0);
  });
});
