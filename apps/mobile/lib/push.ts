import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '~/lib/supabase';

/**
 * Push notifications on this device (the server side is utils/push.ts).
 * Android needs the Firebase project's google-services.json built into the
 * app, and register() crashes without it, so Android stays off until the
 * build sets NEXT_PUBLIC_ANDROID_PUSH=1.
 */
export const pushAvailable = () =>
  Capacitor.isNativePlatform() && (Capacitor.getPlatform() === 'ios' || process.env.NEXT_PUBLIC_ANDROID_PUSH === '1');

const TOKEN_KEY = 'bcs.pushToken';

export type PushState = 'unavailable' | 'on' | 'off' | 'blocked';

/** Where notifications stand on this device, without asking or registering. */
export async function checkPush(): Promise<PushState> {
  if (!pushAvailable()) return 'unavailable';
  const { receive } = await PushNotifications.checkPermissions();
  return receive === 'granted' ? 'on' : receive === 'denied' ? 'blocked' : 'off';
}

/** Registers if the member already allowed notifications; asks first only when `ask` (Account › Notifications). */
export async function startPush(ask = false): Promise<PushState> {
  if (!pushAvailable()) return 'unavailable';
  let { receive } = await PushNotifications.checkPermissions();
  if (ask && receive !== 'granted' && receive !== 'denied') receive = (await PushNotifications.requestPermissions()).receive;
  if (receive === 'denied') return 'blocked';
  if (receive !== 'granted') return 'off';
  await PushNotifications.register();
  return 'on';
}

/** Once per app run: save the token for whoever is signed in, and open the screen a tapped notification points at. */
export function listenForPush(open: (url: string) => void) {
  if (!pushAvailable()) return () => {};
  const handles = [
    PushNotifications.addListener('registration', async ({ value }) => {
      localStorage.setItem(TOKEN_KEY, value);
      const { error } = await supabase.rpc('register_device', { p_token: value, p_platform: Capacitor.getPlatform() });
      if (error) console.error('Push: saving the device', error.message);
    }),
    PushNotifications.addListener('registrationError', ({ error }) => console.error('Push registration', error)),
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const url = notification.data?.url;
      // Only the app's own routes.
      if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) open(url);
    })
  ];
  return () => handles.forEach((handle) => handle.then((listener) => listener.remove()));
}

/** Sign-out: this device stops getting the member's notifications. */
export async function forgetDevice() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) await supabase.from('device_tokens').delete().eq('token', token);
  localStorage.removeItem(TOKEN_KEY);
  if (pushAvailable()) await PushNotifications.unregister().catch(() => undefined);
}
