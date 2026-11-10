// The app is a static export served from the device by Capacitor: no server,
// middleware, server actions or image optimizer. Shared UI is imported from
// ../../components (externalDir).

// Only NEXT_PUBLIC_* values reach the bundle. Refuse to build if one of them
// is a secret, so a misnamed variable can never ship inside the app.
const looksSecret = (value) => {
  if (/^(sk|rk)_(live|test)_|^sb_secret_/.test(value)) return true;
  if (!value.startsWith('eyJ')) return false;
  try {
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role !== 'anon';
  } catch {
    return false;
  }
};
for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith('NEXT_PUBLIC_') && value && looksSecret(value)) {
    throw new Error(`${name} holds a secret key. The app bundle may only contain public values.`);
  }
}

/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  // Every route is a folder with index.html, which is what the native web servers look for.
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { externalDir: true }
};
