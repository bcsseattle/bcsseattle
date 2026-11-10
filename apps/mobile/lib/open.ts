import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { SITE_URL } from '~/lib/api';

/**
 * Payments, the billing portal and admin pages open in the system browser
 * (Safari or Chrome), outside the app: App Store 3.2.2(iv), plan §4.
 */
export const openOutside = (url: string) => AppLauncher.openUrl({ url });

/** Website content (programs, resources) opens in an in-app browser sheet. */
export const openInApp = (path: string) => Browser.open({ url: path.startsWith('http') ? path : `${SITE_URL}${path}` });
