import { NextRequest, NextResponse } from "next/server";
import { findAdmin, createToken, COOKIE_NAME, getDefaultRoute, type AuthUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Employee } from "@/entity/Employee";
import { ClientAccount } from "@/entity/ClientAccount";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  let user: AuthUser | null = null;

  // Check hardcoded admin first
  user = findAdmin(email, password);

  // If not admin, check employees table
  if (!user) {
    try {
      const db = await getDB();
      const employee = await db.getRepository(Employee).findOneBy({ email });
      if (employee && employee.password === password) {
        user = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: "employee",
        };
      }
    } catch {
      // DB not available
    }
  }

  // If not employee, check client accounts (registered clients)
  if (!user) {
    try {
      const db = await getDB();
      const client = await db.getRepository(ClientAccount).findOneBy({ email });
      if (client && client.password === password) {
        user = {
          id: client.id,
          name: client.name,
          email: client.email,
          role: "client",
        };
      }
    } catch {
      // DB not available
    }
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
