import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // public routes you listed
  const isPublic =
    pathname === "/" || 
    pathname === '/about-us' ||
    pathname.startsWith('/about-us/') ||
    pathname === '/contact-us' ||
    pathname === '/donate' ||
    pathname === '/funeral-burial' ||
    pathname === '/funeral-burials' ||
    pathname === '/get-help' ||
    pathname === '/get-involved' ||
    pathname === '/privacy' ||
    pathname === '/register' ||
    pathname === '/resources' ||
    pathname === '/resources/immigration' ||
    pathname.startsWith('/resources/immigration/') ||
    pathname === '/signin' ||
    pathname.startsWith('/signin/') ||
    pathname === '/terms' ||
    pathname === '/what-we-do' ||
    pathname === '/youth-programs';

  // If not logged in and route is protected, redirect to signin
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
