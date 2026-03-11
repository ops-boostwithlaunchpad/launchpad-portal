import { NextRequest, NextResponse } from "next/server";
import { createToken, COOKIE_NAME, getDefaultRoute, type AuthUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { User } from "@/entity/User";
import { verifyPassword } from "@/lib/password";
import { logEvent } from "@/lib/logEvent";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  let authUser: AuthUser | null = null;

  try {
    const db = await getDB();
    const dbUser = await db.getRepository(User).findOneBy({ email });
    if (dbUser && (await verifyPassword(password, dbUser.password))) {
      authUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as AuthUser["role"],
      };
    }
  } catch (err) {
    console.error("Login DB error:", err);
  }

  if (!authUser) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createToken(authUser);
  const redirectTo = getDefaultRoute(authUser.role);

  logEvent({
    event: authUser.role === "client" ? "client_login" : "user_login",
    category: "auth",
    message: `${authUser.name} logged in`,
    userId: authUser.id,
    userName: authUser.name,
    userRole: authUser.role,
    metadata: { email: authUser.email },
  });

  const response = NextResponse.json({ user: authUser, redirectTo });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
