import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Rutas protegidas: retos y admin
  if (pathname.startsWith("/retos") || pathname.startsWith("/admin")) {
    const token = req.cookies.get("sb-access-token")?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?error=Necesitas iniciar sesión";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/retos/:path*", "/admin/:path*"],
};
