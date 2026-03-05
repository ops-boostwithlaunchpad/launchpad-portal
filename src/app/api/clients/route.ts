import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Client } from "@/entity/Client";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole("admin", "sales", "backend", "employee", "client", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const clientRepo = db.getRepository(Client);
    const clients = await clientRepo.find();
    return NextResponse.json(clients);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const clientRepo = db.getRepository(Client);
    const body = await request.json();
    const { id, ...data } = body;
    const newClient = await clientRepo.save(data);
    return NextResponse.json(newClient, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const clientRepo = db.getRepository(Client);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await clientRepo.update(id, data);
    const updated = await clientRepo.findOneBy({ id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const clientRepo = db.getRepository(Client);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await clientRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
