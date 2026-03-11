import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { User } from "@/entity/User";
import { requireRole } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/password";
import { logEvent } from "@/lib/logEvent";

// Parse department field — handles both legacy single string and JSON array
function parseDepartments(dept: string | null): string[] {
  if (!dept) return [];
  try {
    const parsed = JSON.parse(dept);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return [dept];
  }
}

function serializeDepartments(depts: string | string[]): string {
  if (Array.isArray(depts)) return JSON.stringify(depts);
  return JSON.stringify([depts]);
}

// GET all employees (admin only)
export async function GET() {
  const { error } = await requireRole("admin", "subadmin", "sales", "backend");
  if (error) return error;

  try {
    const db = await getDB();
    const employees = await db.getRepository(User).find({
      where: { role: "employee" },
      order: { createdAt: "DESC" },
      select: ["id", "name", "email", "department", "createdAt"],
    });
    // Return departments as array
    const result = employees.map((e) => ({
      ...e,
      department: parseDepartments(e.department),
    }));
    return NextResponse.json(result);
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

    const hashed = await hashPassword(password);
    const serialized = serializeDepartments(department);
    const user = repo.create({ name, email, password: hashed, role: "employee", department: serialized });
    const saved = await repo.save(user);
    const { password: _, ...result } = saved;

    logEvent({
      event: "user_created",
      category: "employees",
      message: `Employee created: ${name}`,
      userId: saved.id,
      userName: name,
      userRole: "employee",
      metadata: { email, department },
    });

    return NextResponse.json({ ...result, department: parseDepartments(saved.department) }, { status: 201 });
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
    if (password) user.password = await hashPassword(password);
    if (department) user.department = serializeDepartments(department);

    const oldName = user.name;
    const updated = await repo.save(user);
    const { password: _, ...result } = updated;

    logEvent({
      event: "user_updated",
      category: "employees",
      message: `Employee updated: ${updated.name}`,
      userId: updated.id,
      userName: updated.name,
      userRole: "employee",
      metadata: { email: updated.email, previousName: oldName !== updated.name ? oldName : undefined },
    });

    return NextResponse.json({ ...result, department: parseDepartments(updated.department) });
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
    const repo = db.getRepository(User);
    const user = await repo.findOneBy({ id: Number(id), role: "employee" });

    if (user) {
      await repo.delete({ id: Number(id), role: "employee" });

      logEvent({
        event: "user_deleted",
        category: "employees",
        message: `Employee deleted: ${user.name}`,
        userId: user.id,
        userName: user.name,
        userRole: "employee",
        metadata: { email: user.email },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete employee:", err);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
