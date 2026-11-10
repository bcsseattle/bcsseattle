'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '~/lib/supabase';
import { parseAppLink } from '~/lib/app-links';
import { listenForPush, startPush } from '~/lib/push';

type SessionState = { session: Session | null; ready: boolean };
const SessionContext = createContext<SessionState>({ session: null, ready: false });
export const useSession = () => useContext(SessionContext);

/**
 * Holds the signed-in session, refreshes tokens only while the app is in the
 * foreground (as Supabase recommends on mobile) and routes links that open the app.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ session: null, ready: false });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, ready: true }));

    const openLink = async (href: string) => {
      const link = parseAppLink(href, process.env.NEXT_PUBLIC_SITE_URL!);
      if (!link) return;
      if (link.verify) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: link.verify.tokenHash, type: link.verify.type });
        if (error) {
          toast.error('That link has expired or was already used. Sign in, or ask for a new code.');
          return router.replace('/signin/');
        }
      }
      router.replace(link.to);
    };

    // A link that cold-started the app is routed after the session loads, so it
    // lands after the start screen's own redirect rather than before it.
    supabase.auth
      .getSession()
      .then(({ data }) => setState({ session: data.session, ready: true }))
      .then(() => App.getLaunchUrl())
      .then((launch) => {
        if (launch?.url) openLink(launch.url);
      });
    const listeners = [
      App.addListener('appUrlOpen', ({ url }) => openLink(url)),
      App.addListener('appStateChange', ({ isActive }) =>
        isActive ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()
      )
    ];
    const stopPush = listenForPush((url) => router.push(url));
    return () => {
      stopPush();
      data.subscription.unsubscribe();
      listeners.forEach((listener) => listener.then((l) => l.remove()));
    };
  }, [router]);

  // Signed in: register this device for notifications if the member already allowed them (never asks here).
  const userId = state.session?.user.id;
  useEffect(() => {
    if (userId) startPush().catch(() => undefined);
  }, [userId]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

/** Auth screens send a member who is already signed in to Home. */
export function useSignedInRedirect() {
  const { session, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && session) router.replace('/home/');
  }, [ready, session, router]);
}

/** Members-only screens: the session, or null while it loads or after sending a signed-out visitor to Sign in. */
export function useRequireSession() {
  const { session, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && !session) router.replace('/signin/');
  }, [ready, session, router]);
  return session;
}
