import { NextRequest, NextResponse } from "next/server";
import { findUser, createToken, COOKIE_NAME, getDefaultRoute, type AuthUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { User } from "@/entity/User";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  let user: AuthUser | null = null;

  // Try DB first
  try {
    const db = await getDB();
    const dbUser = await db.getRepository(User).findOneBy({ email });
    if (dbUser && dbUser.password === password) {
      user = { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role as AuthUser["role"] };
    }
  } catch {
    // DB not available, fall through to hardcoded
  }

  // Fallback to hardcoded users
  if (!user) {
    user = findUser(email, password);
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createToken(user);
  const redirectTo = getDefaultRoute(user.role);

  const response = NextResponse.json({ user, redirectTo });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
