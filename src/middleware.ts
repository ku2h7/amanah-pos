import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

// API routes that should be public
const publicApiPaths = ['/api/register', '/api/login'];

// Paths that only admins can access
const adminPaths = ['/admin'];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  const isPublicPath = publicPaths.some(path =>
    pathname.startsWith(path)
  );
  const isPublicApiPath = publicApiPaths.some(path =>
    pathname.startsWith(path)
  );
  const isAdminPath = adminPaths.some(path =>
    pathname.startsWith(path)
  );

  // Skip middleware untuk API public
  if (isPublicApiPath) {
    return res;
  }

  // Redirect to login if not authenticated and not on a public path
  if (!session && !isPublicPath && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to home if already logged in and trying to access auth pages (except register)
  if (session && isPublicPath && pathname !== '/register') {
    console.log('Middleware: Redirecting logged in user from', pathname, 'to /');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check admin access for admin paths
  if (session && isAdminPath) {
    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_id: session.user.id,
    });

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
