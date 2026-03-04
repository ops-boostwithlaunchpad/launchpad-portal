import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Employee } from "@/entity/Employee";
import { requireRole } from "@/lib/apiAuth";

// GET all employees (admin only)
export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const db = await getDB();
    const employees = await db.getRepository(Employee).find({ order: { createdAt: "DESC" } });
    return NextResponse.json(employees);
  } catch (err) {
    console.error("Failed to fetch employees:", err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST create employee (admin only)
export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const body = await request.json();
  const { name, email, password, department } = body;

  if (!name || !email || !password || !department) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(Employee);

    // Check if email already exists
    const existing = await repo.findOneBy({ email });
    if (existing) {
      return NextResponse.json({ error: "An employee with this email already exists" }, { status: 409 });
    }

    const employee = repo.create({ name, email, password, department });
    const saved = await repo.save(employee);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("Failed to create employee:", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

// PUT update employee (admin only)
export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const body = await request.json();
  const { id, name, email, password, department } = body;

  if (!id) {
    return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const repo = db.getRepository(Employee);
    const employee = await repo.findOneBy({ id });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (name) employee.name = name;
    if (email) employee.email = email;
    if (password) employee.password = password;
    if (department) employee.department = department;

    const updated = await repo.save(employee);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update employee:", err);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

// DELETE employee (admin only)
export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();
    await db.getRepository(Employee).delete(Number(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete employee:", err);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
