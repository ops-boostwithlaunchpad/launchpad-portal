import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { AgentEntity } from "@/entity/AgentEntity";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole("admin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const agentRepo = db.getRepository(AgentEntity);
    const agents = await agentRepo.find();
    return NextResponse.json(agents);
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
    const agentRepo = db.getRepository(AgentEntity);
    const body = await request.json();
    const { id, ...data } = body;
    const newAgent = await agentRepo.save(data);
    return NextResponse.json(newAgent, { status: 201 });
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
    const agentRepo = db.getRepository(AgentEntity);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await agentRepo.update(id, data);
    const updated = await agentRepo.findOneBy({ id });
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
    const agentRepo = db.getRepository(AgentEntity);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await agentRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
