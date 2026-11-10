/**
 * The mobile app (docs/mobile-app-plan.md). Its iOS bundle ID and Android
 * application ID, which is also its URL scheme.
 */
export const APP_ID = 'org.bcsseattle.app';

/** Where the Capacitor WebView's pages come from: iOS, then Android. */
export const APP_ORIGINS = ['capacitor://localhost', 'https://localhost'];

/**
 * Website paths that open the app (universal links / App Links): /m/* only, so
 * the website's own /auth/callback and Stripe returns are never taken over.
 */
export const APP_LINK_PREFIX = '/m/';
