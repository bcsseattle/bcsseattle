import { createClient } from '@supabase/supabase-js';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import type { Database } from '@/types_db';

// Static export prerenders each screen in Node, where there is no device storage or session.
const onDevice = typeof window !== 'undefined';

// The iOS Keychain outlives the app, so a reinstall would come back signed in.
// The web view's storage doesn't, so its missing marker means a fresh install:
// wipe the old session before anything reads it. (If iOS ever purged the web
// view's storage, the cost is one extra sign-in.)
const INSTALLED = 'bcs.installed';
const ready =
  onDevice && Capacitor.isNativePlatform() && !localStorage.getItem(INSTALLED)
    ? SecureStorage.clear().then(() => localStorage.setItem(INSTALLED, '1'))
    : Promise.resolve();

// A plain object, not the plugin itself: a Capacitor plugin answers every
// property with a function, so auth-js would read `storage.isServer` as true,
// wrap the user in a warning Proxy and then fail to broadcast session changes.
const storage = {
  getItem: async (key: string) => {
    await ready;
    return SecureStorage.getItem(key);
  },
  setItem: (key: string, value: string) => SecureStorage.setItem(key, value),
  removeItem: (key: string) => SecureStorage.removeItem(key)
};

/**
 * The app's only Supabase client: the public anon key plus the member's own
 * session, so every read runs under the same RLS as the website. The session
 * is kept in the Keychain (iOS) or Keystore-encrypted storage (Android).
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,
      flowType: 'pkce',
      persistSession: onDevice,
      autoRefreshToken: onDevice,
      detectSessionInUrl: false
    }
  }
);

/** Signs this device out (other devices and the website stay signed in) and wipes stored keys. */
export async function signOut() {
  // Before signing out: removing this device's push token needs the session (RLS).
  const { forgetDevice } = await import('~/lib/push');
  await forgetDevice().catch(() => undefined);
  await supabase.auth.signOut({ scope: 'local' });
  await SecureStorage.clear();
}
