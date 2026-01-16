import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.has('_rsc')) {
    return NextResponse.next();
  }
  if (request.method === 'HEAD') {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/community-funds/:path*",
    "/contribute/:path*",
    "/donate/:path*", // keeps /donate public, protects /donate/confirmation/*
    "/elections/:path*",
    "/fundraisers/:path*",
    "/members/:path*",
    "/membership-fee/:path*",
  ]
};
