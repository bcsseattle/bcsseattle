import { supabase } from '~/lib/supabase';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

/**
 * Calls the website's API with the member's access token (Phase 1 made
 * createClient() accept it). `json` sends a JSON body, `form` a multipart one.
 * Throws an Error carrying the server's message, ready to show.
 */
export async function api<T = unknown>(
  path: string,
  { method = 'GET', json, form }: { method?: string; json?: unknown; form?: FormData } = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${SITE_URL}${path}`, {
    method: json || form ? (method === 'GET' ? 'POST' : method) : method,
    headers: {
      ...(data.session && { Authorization: `Bearer ${data.session.access_token}` }),
      ...(json !== undefined && { 'Content-Type': 'application/json' })
    },
    body: json !== undefined ? JSON.stringify(json) : form
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Something went wrong. Check your connection and try again.');
  return body as T;
}

/** A Supabase query's data, or its error thrown as a message. */
export async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
