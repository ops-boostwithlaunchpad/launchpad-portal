import { NextRequest, NextResponse } from "next/server";
import { createToken, COOKIE_NAME, type AuthUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Client } from "@/entity/Client";
import { User } from "@/entity/User";
import { hashPassword } from "@/lib/password";
import { logEvent } from "@/lib/logEvent";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const userRepo = db.getRepository(User);

    // Check if already registered — allow password update
    const existingUser = await userRepo.findOneBy({ email });
    if (existingUser) {
      existingUser.password = await hashPassword(password);
      await userRepo.save(existingUser);

      const authUser: AuthUser = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role as AuthUser["role"],
      };

      const token = await createToken(authUser);
      const redirectTo = existingUser.role === "client" ? "/dashboard/portal" : "/dashboard";

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

    // Check if email exists in lp_clients table (real onboarded clients)
    const clientRecord = await db.getRepository(Client).findOneBy({ email });
    if (!clientRecord) {
      return NextResponse.json(
        { error: "This email is not in our client records. Please contact your account manager." },
        { status: 403 }
      );
    }

    // Create user with client role
    const hashed = await hashPassword(password);
    const newUser = userRepo.create({ name: clientRecord.name, email, password: hashed, role: "client" });
    const saved = await userRepo.save(newUser);

    // Create auth token
    const authUser: AuthUser = {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: "client",
    };

    const token = await createToken(authUser);

    logEvent({
      event: "user_created",
      category: "auth",
      message: `New client account created: ${saved.name}`,
      userId: saved.id,
      userName: saved.name,
      userRole: "client",
      metadata: { email },
    });

    const response = NextResponse.json({ user: authUser, redirectTo: "/dashboard/portal" });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
