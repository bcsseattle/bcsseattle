import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { Database } from '@/types_db';

/**
 * The mobile app has no cookies: it sends the member's Supabase access token as
 * `Authorization: Bearer <jwt>`. Only a JWT-shaped value counts, so the cron and
 * internal-email secrets (also sent as Bearer) are never mistaken for a user.
 */
export const bearerToken = (authorization: string | null) =>
  /^Bearer (eyJ[\w-]*\.[\w-]+\.[\w-]+)$/.exec(authorization ?? '')?.[1] ?? null;

export const createClient = async () => {
  const cookieStore = await cookies();
  const token = bearerToken((await headers()).get('authorization'));

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // With a token, auth.getUser() checks it with Supabase Auth and every
      // query runs as that user under RLS, exactly as a cookie session would.
      ...(token && { global: { headers: { Authorization: `Bearer ${token}` } } }),
      cookies: {
        getAll() {
          return token ? [] : cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error(error);
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
};
