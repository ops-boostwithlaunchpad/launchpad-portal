import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Agency } from "@/entity/Agency";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const agencyRepo = db.getRepository(Agency);
    const agencies = await agencyRepo.find();
    return NextResponse.json(agencies);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const agencyRepo = db.getRepository(Agency);
    const body = await request.json();
    const { id, ...data } = body;
    const newAgency = await agencyRepo.save(data);
    return NextResponse.json(newAgency, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const agencyRepo = db.getRepository(Agency);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await agencyRepo.update(id, data);
    const updated = await agencyRepo.findOneBy({ id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const agencyRepo = db.getRepository(Agency);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await agencyRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
