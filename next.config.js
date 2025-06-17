/** @type {import('next').NextConfig} */
const nextConfig = {
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
  }
};

module.exports = nextConfig;
