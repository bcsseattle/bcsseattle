'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { TextZoom } from '@capacitor/text-zoom';
import { WifiOff } from 'lucide-react';

// Back from one of these leaves the app (Android), as on any tab root.
const ROOTS = new Set(['', '/home', '/give', '/elections', '/funds', '/more', '/signin']);

/**
 * Device behaviour that isn't any one screen's: text follows the phone's text
 * size, Android's back button closes a sheet, then goes back, then exits from
 * a tab root, and a pill says when the phone is offline.
 */
export function NativeChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Dynamic Type (iOS) and font size (Android); the type scale is in rem, so it all follows.
    const zoom = () =>
      TextZoom.getPreferred()
        .then(({ value }) => {
          // From the accessibility sizes up, the layout switches to wrapping rows (app.css).
          document.documentElement.toggleAttribute('data-large-text', value >= 1.35);
          return TextZoom.set({ value });
        })
        .catch(() => undefined);
    zoom();

    const listeners = [
      App.addListener('resume', zoom),
      App.addListener('backButton', ({ canGoBack }) => {
        // An open sheet or dialog closes first, as Escape closes it.
        if (document.querySelector('[role="alertdialog"], [role="dialog"]')) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          return;
        }
        if (ROOTS.has((path.current ?? '').replace(/\/$/, ''))) App.exitApp();
        else if (canGoBack) window.history.back();
        else router.replace('/home/');
      })
    ];
    return () => listeners.forEach((listener) => listener.then((l) => l.remove()));
  }, [router]);

  useEffect(() => {
    Network.getStatus().then(({ connected }) => setOffline(!connected));
    const listener = Network.addListener('networkStatusChange', ({ connected }) => setOffline(!connected));
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-50 flex justify-center px-4"
    >
      <p className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-caption text-background shadow-md">
        <WifiOff aria-hidden className="size-3.5" />
        You’re offline. What you see may be out of date.
      </p>
    </div>
  );
}
