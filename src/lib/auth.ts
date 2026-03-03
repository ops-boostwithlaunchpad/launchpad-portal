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

// Hardcoded users — replace with DB lookup later
const USERS: (AuthUser & { password: string })[] = [
  { id: 1, name: "Admin User", email: "admin@gmail.com", role: "admin", password: "123" },
  { id: 2, name: "Sales User", email: "sales@gmail.com", role: "sales", password: "123" },
  { id: 3, name: "Backend User", email: "backend@gmail.com", role: "backend", password: "123" },
  { id: 4, name: "Client User", email: "client@gmail.com", role: "client", password: "123" },
];

export function findUser(email: string, password: string): AuthUser | null {
  const user = USERS.find((u) => u.email === email && u.password === password);
  if (!user) return null;
  const { password: _, ...authUser } = user;
  return authUser;
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
    case "client":
      return "/dashboard/portal";
    default:
      return "/dashboard/sales/master";
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
    case "client":
      return ["/dashboard/portal"];
    default:
      return [];
  }
}

export { COOKIE_NAME, JWT_SECRET };
