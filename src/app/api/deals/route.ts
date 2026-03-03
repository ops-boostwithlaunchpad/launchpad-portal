import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Deal } from "@/entity/Deal";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole("admin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const dealRepo = db.getRepository(Deal);
    const deals = await dealRepo.find();
    return NextResponse.json(deals);
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
    const dealRepo = db.getRepository(Deal);
    const body = await request.json();
    const { id, ...data } = body;
    const newDeal = await dealRepo.save(data);
    return NextResponse.json(newDeal, { status: 201 });
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
    const dealRepo = db.getRepository(Deal);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await dealRepo.update(id, data);
    const updated = await dealRepo.findOneBy({ id });
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
    const dealRepo = db.getRepository(Deal);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await dealRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
