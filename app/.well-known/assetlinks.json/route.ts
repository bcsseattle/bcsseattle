import { NextResponse } from 'next/server';
import { APP_ID } from '@/utils/app-links';

/**
 * Android App Links. ANDROID_CERT_SHA256 is the app signing certificate's
 * SHA-256 from Play Console › App signing (comma-separate several, e.g. an
 * upload key for internal builds). Unset means no app yet: 404.
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((f) => f.trim()).filter(Boolean);
  if (fingerprints.length === 0) return new NextResponse(null, { status: 404 });

  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: fingerprints }
    }
  ]);
}
