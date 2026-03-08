import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { User } from "@/entity/User";
import { requireRole } from "@/lib/apiAuth";

// GET all employees (admin only)
export async function GET() {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  try {
    const db = await getDB();
    const employees = await db.getRepository(User).find({
      where: { role: "employee" },
      order: { createdAt: "DESC" },
      select: ["id", "name", "email", "department", "createdAt"],
    });
    return NextResponse.json(employees);
  } catch (err) {
    console.error("Failed to fetch employees:", err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST create employee (admin only)
export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  const body = await request.json();
  const { name, email, password, department } = body;

  if (!name || !email || !password || !department) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(User);

    const existing = await repo.findOneBy({ email });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const user = repo.create({ name, email, password, role: "employee", department });
    const saved = await repo.save(user);
    const { password: _, ...result } = saved;
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Failed to create employee:", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

// PUT update employee (admin only)
export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  const body = await request.json();
  const { id, name, email, password, department } = body;

  if (!id) {
    return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(User);
    const user = await repo.findOneBy({ id, role: "employee" });

    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;
    if (department) user.department = department;

    const updated = await repo.save(user);
    const { password: _, ...result } = updated;
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to update employee:", err);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

// DELETE employee (admin only)
export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    await db.getRepository(User).delete({ id: Number(id), role: "employee" });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete employee:", err);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
