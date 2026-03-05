import { NextRequest, NextResponse } from "next/server";
import { createToken, COOKIE_NAME, type AuthUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Client } from "@/entity/Client";
import { ClientAccount } from "@/entity/ClientAccount";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const accountRepo = db.getRepository(ClientAccount);

    // Check if already registered
    const existingAccount = await accountRepo.findOneBy({ email });
    if (existingAccount) {
      return NextResponse.json(
        { error: "This email is already registered. Please sign in instead." },
        { status: 409 }
      );
    }

    // Check if email exists in lp_clients table (real onboarded clients)
    const clientRecord = await db.getRepository(Client).findOneBy({ email });
    if (!clientRecord) {
      return NextResponse.json(
        { error: "This email is not in our client records. Please contact your account manager." },
        { status: 403 }
      );
    }

    // Create the client account using name from lp_clients
    const account = accountRepo.create({ name: clientRecord.name, email, password });
    const saved = await accountRepo.save(account);

    // Create auth token
    const user: AuthUser = {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: "client",
    };

    const token = await createToken(user);

    const response = NextResponse.json({ user, redirectTo: "/dashboard/portal" });
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
