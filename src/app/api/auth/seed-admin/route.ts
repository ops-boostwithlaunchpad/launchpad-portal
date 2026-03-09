import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { User } from "@/entity/User";
import { hashPassword } from "@/lib/password";

/**
 * POST /api/auth/seed-admin
 * One-time endpoint to create the admin user in the database.
 * Requires a secret token to prevent unauthorized access.
 * After running once, you can remove this file.
 */
export async function POST(request: NextRequest) {
  const { secret, password } = await request.json();

  // Protect with env secret
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(User);

    const existing = await repo.findOneBy({ email: "admin@boostwithlaunchpad.com" });
    if (existing) {
      // Update password if admin already exists
      existing.password = await hashPassword(password);
      await repo.save(existing);
      return NextResponse.json({ message: "Admin password updated" });
    }

    const hashed = await hashPassword(password);
    await repo.save(
      repo.create({
        name: "Admin",
        email: "admin@boostwithlaunchpad.com",
        password: hashed,
        role: "admin",
      })
    );

    return NextResponse.json({ message: "Admin user created" }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
