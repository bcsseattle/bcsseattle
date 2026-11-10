import type { CapacitorConfig } from '@capacitor/cli';

// `MOBILE_ENV=local pnpm sync` builds for a local Supabase and website, which run over plain http.
const local = process.env.MOBILE_ENV === 'local';

const config: CapacitorConfig = {
  appId: 'org.bcsseattle.app',
  appName: 'BCS Seattle',
  webDir: 'out',
  ...(local && { server: { cleartext: true } }),
  plugins: {
    // Dark status-bar text and icons: every screen has a light background.
    SystemBars: { style: 'LIGHT' },
    // Show a notification that arrives while the app is open, as when it's closed.
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] }
  }
};

export default config;
