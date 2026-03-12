import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME, getAllowedRoutes, getDefaultRoute } from "./lib/auth";
import type { Role } from "./lib/types";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as Role;
    const allowed = getAllowedRoutes(role);

    // Check if user has access to this route
    const hasAccess = allowed.some((prefix) => pathname.startsWith(prefix));

    if (!hasAccess) {
      const defaultRoute = getDefaultRoute(role);
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    return NextResponse.next();
  } catch {
    // Don't clear cookie on transient errors (Edge Function cold starts, etc.)
    // Just redirect to login — if the token is truly expired, login page handles it
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const runtime = "experimental-edge";

export const config = {
  matcher: ["/dashboard/:path*"],
};
