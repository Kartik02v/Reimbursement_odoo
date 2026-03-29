import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware - NextAuth v5 beta has different patterns
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Allow auth routes
  if (path.startsWith('/api/auth') || path.startsWith('/login') || path.startsWith('/signup')) {
    return NextResponse.next();
  }
  
  // For now, allow all requests - will implement proper auth check after NextAuth stabilizes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/users/:path*',
    '/api/expenses/:path*',
    '/api/approvals/:path*',
    '/api/categories/:path*',
    '/api/notifications/:path*',
    '/api/analytics/:path*',
    '/api/upload/:path*',
  ],
};
