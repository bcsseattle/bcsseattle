/** @type {import('next').NextConfig} */
const nextConfig = {
  // The E2E build uses its own folder so it can run beside `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      // Local development
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**'
      },
      // Production - Generic Supabase pattern
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**'
      },
      // Avatars
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc'
      },
      // Add your specific production domain if needed
      ...(process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: 'https',
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              pathname: '/storage/v1/object/public/**'
            }
          ]
        : [])
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60
  },
  // The breadcrumbs link every prefix of the URL; these prefixes have no page of their own.
  async redirects() {
    const uuid = '([0-9a-f-]{36})';
    return [
      { source: '/admin', destination: '/admin/members', permanent: false },
      { source: '/fundraisers/admin', destination: '/fundraisers', permanent: false },
      { source: `/fundraisers/admin/:id${uuid}`, destination: '/fundraisers/admin/:id/edit', permanent: false },
      { source: '/fundraisers/:id/donations', destination: '/fundraisers/:id', permanent: false },
      { source: '/fundraisers/:id/donations/:donationId', destination: '/fundraisers/:id/donations/:donationId/confirmation', permanent: false }
    ];
  }
};

module.exports = nextConfig;
