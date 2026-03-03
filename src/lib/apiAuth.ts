import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { Role } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "launchpad-secret-key-change-in-prod"
);
const COOKIE_NAME = "lp_token";

interface AuthResult {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export async function getApiUser(): Promise<AuthResult | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
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

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireRole(...allowedRoles: Role[]) {
  const user = await getApiUser();
  if (!user) return { user: null, error: unauthorized() };
  if (!allowedRoles.includes(user.role)) return { user, error: forbidden() };
  return { user, error: null };
}
