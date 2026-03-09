import { NextResponse } from "next/server";
import type { Role } from "./types";
import { getCurrentUser, type AuthUser } from "./auth";

export async function getApiUser(): Promise<AuthUser | null> {
  return getCurrentUser();
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
