import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "launchpad-secret-key-change-in-prod"
);
const COOKIE_NAME = "lp_token";

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["/dashboard"],
  subadmin: ["/dashboard"],
  sales: ["/dashboard/sales", "/dashboard/clients"],
  backend: ["/dashboard/backend", "/dashboard/clients"],
  employee: ["/dashboard/backend", "/dashboard/clients", "/dashboard/my-tasks"],
  client: ["/dashboard/portal", "/dashboard/cancel"],
  agent: ["/dashboard/sales", "/dashboard/clients"],
  agency: ["/dashboard/sales", "/dashboard/clients"],
};

const ROLE_DEFAULT: Record<string, string> = {
  admin: "/dashboard/sales/master",
  subadmin: "/dashboard/sales/master",
  sales: "/dashboard/sales/master",
  backend: "/dashboard/backend",
  employee: "/dashboard/backend",
  client: "/dashboard/portal",
  agent: "/dashboard/sales/master",
  agency: "/dashboard/sales/master",
};

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
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    const allowed = ROLE_ROUTES[role] || [];

    // Check if user has access to this route
    const hasAccess = allowed.some((prefix) => pathname.startsWith(prefix));

    if (!hasAccess) {
      // Redirect to their default page
      const defaultRoute = ROLE_DEFAULT[role] || "/login";
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid token → clear cookie and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
