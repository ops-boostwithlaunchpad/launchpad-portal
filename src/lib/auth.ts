import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "./types";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required");
}

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

const COOKIE_NAME = "lp_token";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
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
    case "subadmin":
      return "/dashboard/sales/master";
    case "sales":
      return "/dashboard/sales/master";
    case "backend":
      return "/dashboard/backend";
    case "employee":
      return "/dashboard/my-tasks";
    case "client":
      return "/dashboard/portal";
    case "agent":
      return "/dashboard/sales/master";
    case "agency":
      return "/dashboard/sales/master";
    default:
      return "/dashboard/backend";
  }
}

// Role -> allowed route prefixes
export function getAllowedRoutes(role: Role): string[] {
  switch (role) {
    case "admin":
      return ["/dashboard"];
    case "subadmin":
      return ["/dashboard"];
    case "sales":
      return ["/dashboard/sales", "/dashboard/clients"];
    case "backend":
      return ["/dashboard/backend", "/dashboard/clients"];
    case "employee":
      return ["/dashboard/my-tasks"];
    case "client":
      return ["/dashboard/portal", "/dashboard/cancel", "/dashboard/contact-admin"];
    case "agent":
      return ["/dashboard/sales/master"];
    case "agency":
      return ["/dashboard/sales"];
    default:
      return [];
  }
}

export { COOKIE_NAME, JWT_SECRET };
