import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // 公開頁面
  const publicPaths = ['/login', '/api/auth/login'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // API 路由驗證
  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 頁面路由驗證
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
