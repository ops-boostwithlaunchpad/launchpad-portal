import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { User } from "@/entity/User";
import { requireRole } from "@/lib/apiAuth";

// GET all sub-admins (admin only)
export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const db = await getDB();
    const subAdmins = await db.getRepository(User).find({
      where: { role: "subadmin" },
      order: { createdAt: "DESC" },
      select: ["id", "name", "email", "phone", "createdAt"],
    });
    return NextResponse.json(subAdmins);
  } catch (err) {
    console.error("Failed to fetch sub-admins:", err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST create sub-admin (admin only)
export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const body = await request.json();
  const { name, email, password, phone } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(User);

    const existing = await repo.findOneBy({ email });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const user = repo.create({ name, email, password, role: "subadmin", phone: phone || null });
    const saved = await repo.save(user);
    const { password: _, ...result } = saved;
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Failed to create sub-admin:", err);
    return NextResponse.json({ error: "Failed to create sub-admin" }, { status: 500 });
  }
}

// PUT update sub-admin (admin only)
export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const body = await request.json();
  const { id, name, email, password, phone } = body;

  if (!id) {
    return NextResponse.json({ error: "Sub-admin ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(User);
    const user = await repo.findOneBy({ id, role: "subadmin" });

    if (!user) {
      return NextResponse.json({ error: "Sub-admin not found" }, { status: 404 });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;
    if (phone !== undefined) user.phone = phone || null;

    const updated = await repo.save(user);
    const { password: _, ...result } = updated;
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to update sub-admin:", err);
    return NextResponse.json({ error: "Failed to update sub-admin" }, { status: 500 });
  }
}

// DELETE sub-admin (admin only)
export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Sub-admin ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    await db.getRepository(User).delete({ id: Number(id), role: "subadmin" });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete sub-admin:", err);
    return NextResponse.json({ error: "Failed to delete sub-admin" }, { status: 500 });
  }
}
