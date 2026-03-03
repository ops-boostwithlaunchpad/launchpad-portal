import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Task } from "@/entity/Task";
import { requireRole } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "sales", "backend", "client");
  if (error) return error;
  try {
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");

    const tasks = team
      ? await taskRepo.find({ where: { team } })
      : await taskRepo.find();

    return NextResponse.json(tasks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "sales", "backend");
  if (error) return error;
  try {
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    const body = await request.json();
    const { id, ...data } = body;
    const newTask = await taskRepo.save({ ...data, logs: [] });
    return NextResponse.json(newTask, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireRole("admin", "backend");
  if (error) return error;
  try {
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    const body = await request.json();
    const { id, status, log } = body;

    const task = await taskRepo.findOneBy({ id });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (status) {
      task.status = status;
    }

    if (log) {
      task.logs.push(log);
    }

    const updated = await taskRepo.save(task);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "backend");
  if (error) return error;
  try {
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await taskRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
