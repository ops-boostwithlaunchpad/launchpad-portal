import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "launchpad-secret-key-change-in-prod"
);

const COOKIE_NAME = "lp_token";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

// Only one hardcoded admin user
const ADMIN_USER: AuthUser & { password: string } = {
  id: 0,
  name: "Admin",
  email: "admin@boostwithlaunchpad.com",
  role: "admin",
  password: "123",
};

export function findAdmin(email: string, password: string): AuthUser | null {
  if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
    const { password: _, ...authUser } = ADMIN_USER;
    return authUser;
  }
  return null;
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Role -> default landing page
export function getDefaultRoute(role: Role): string {
  switch (role) {
    case "admin":
      return "/dashboard/sales/master";
    case "sales":
      return "/dashboard/sales/master";
    case "backend":
      return "/dashboard/backend";
    case "employee":
      return "/dashboard/backend";
    case "client":
      return "/dashboard/portal";
    default:
      return "/dashboard/backend";
  }
}

// Role -> allowed route prefixes
export function getAllowedRoutes(role: Role): string[] {
  switch (role) {
    case "admin":
      return ["/dashboard"];
    case "sales":
      return ["/dashboard/sales", "/dashboard/clients"];
    case "backend":
      return ["/dashboard/backend", "/dashboard/clients"];
    case "employee":
      return ["/dashboard/backend", "/dashboard/clients"];
    case "client":
      return ["/dashboard/portal"];
    default:
      return [];
  }
}

export { COOKIE_NAME, JWT_SECRET };
