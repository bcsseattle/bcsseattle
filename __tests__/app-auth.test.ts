/** The mobile app authenticates with `Authorization: Bearer <jwt>` (createClient) and calls /api/* cross-origin (middleware). */
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { bearerToken, createClient } from '@/utils/supabase/server';
import { middleware } from '@/middleware';
import { updateSession } from '@/utils/supabase/middleware';

let requestHeaders = new Headers();
const cookieList = [{ name: 'sb-auth', value: 'cookie-session' }];
jest.mock('next/headers', () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ getAll: () => cookieList, set: jest.fn() })
}));
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn(() => ({})) }));
jest.mock('@/utils/supabase/middleware', () => ({ updateSession: jest.fn(async () => new Response('session')) }));

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl';

describe('bearerToken', () => {
  it('accepts a JWT', () => expect(bearerToken(`Bearer ${JWT}`)).toBe(JWT));
  it.each([null, '', JWT, 'Bearer cron-secret-value', `Basic ${JWT}`, `Bearer ${JWT} extra`])(
    'ignores %p',
    (value) => expect(bearerToken(value)).toBeNull()
  );
});

describe('createClient', () => {
  const options = () => (createServerClient as jest.Mock).mock.calls.at(-1)[2];

  it('uses the cookie session when there is no token (the website)', async () => {
    requestHeaders = new Headers();
    await createClient();
    expect(options().global).toBeUndefined();
    expect(options().cookies.getAll()).toBe(cookieList);
  });

  it("uses the app's token, and ignores cookies, when one is sent", async () => {
    requestHeaders = new Headers({ authorization: `Bearer ${JWT}` });
    await createClient();
    expect(options().global).toEqual({ headers: { Authorization: `Bearer ${JWT}` } });
    expect(options().cookies.getAll()).toEqual([]);
  });

  it('does not treat the cron secret as a user', async () => {
    requestHeaders = new Headers({ authorization: 'Bearer some-cron-secret' });
    await createClient();
    expect(options().global).toBeUndefined();
  });
});

describe('middleware CORS for /api', () => {
  const call = (path: string, { method, origin }: { method?: string; origin?: string } = {}) =>
    middleware(new NextRequest(`http://localhost${path}`, { method, headers: origin ? { origin } : undefined }));

  it.each(['capacitor://localhost', 'https://localhost'])('answers the preflight from %s', async (origin) => {
    const res = await call('/api/app/checkout', { method: 'OPTIONS', origin });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    expect(res.headers.get('access-control-allow-headers')).toContain('Authorization');
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('adds CORS headers to app requests and passes them on', async () => {
    const res = await call('/api/elections/e1/vote/candidates', { method: 'POST', origin: 'capacitor://localhost' });
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
  });

  it('leaves other origins and the website alone', async () => {
    const res = await call('/api/app/checkout', { method: 'POST', origin: 'https://evil.example' });
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('still refreshes the session on portal pages', async () => {
    await call('/account');
    expect(updateSession).toHaveBeenCalled();
  });
});
