import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { APP_ORIGINS } from '@/utils/app-links';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return appCors(request);
  }
  if (request.nextUrl.searchParams.has('_rsc')) {
    return NextResponse.next();
  }
  if (request.method === 'HEAD') {
    return NextResponse.next();
  }

  return updateSession(request);
}

/**
 * The mobile app's WebView calls /api/* from its own origin with a Bearer
 * token (never cookies, so no Allow-Credentials). Requests from any other
 * origin pass through untouched, as before /api was matched here.
 */
function appCors(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  if (!APP_ORIGINS.includes(origin)) return NextResponse.next();

  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers });

  const response = NextResponse.next();
  Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/api/:path*", // CORS for the mobile app only; see appCors
    "/community-funds/:path*",
    "/contribute/:path*",
    "/donate/:path*", // session refresh only: /donate and its receipts are public
    "/elections/:path*",
    "/fundraisers/:path*",
    "/members/:path*",
    "/membership-fee/:path*",
  ]
};
