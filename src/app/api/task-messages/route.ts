import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { TaskMessage } from "@/entity/TaskMessage";
import { Task } from "@/entity/Task";
import { requireRole } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { presenceMap, openTaskMap, ONLINE_THRESHOLD } from "@/app/api/presence/route";

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "employee");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  try {
    const db = await getDB();
    const messages = await db.getRepository(TaskMessage).find({
      where: { taskId: Number(taskId) },
      order: { createdAt: "ASC" },
    });
    // Ensure createdAt is always a proper ISO string with timezone
    const serialized = messages.map((m) => ({
      ...m,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }));
    return NextResponse.json(serialized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "employee");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { taskId, message } = body;
    if (!taskId || !message?.trim()) {
      return NextResponse.json({ error: "taskId and message required" }, { status: 400 });
    }

    const db = await getDB();

    // Verify the task exists and user has access
    const task = await db.getRepository(Task).findOneBy({ id: Number(taskId) });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Employee can only message on their own tasks
    if (user.role === "employee" && task.assignedTo !== user.id) {
      return NextResponse.json({ error: "Not authorized for this task" }, { status: 403 });
    }

    const msgEntity = await db.getRepository(TaskMessage).save({
      taskId: Number(taskId),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      message: message.trim(),
      isRead: false,
    });

    // Send notification only when employee messages admin (not the other way)
    const sb = getSupabase();
    if (sb && user.role === "employee") {
      const recipientId = 0; // admin
      // Check if admin has this task's chat open via in-memory presence
      const lastSeen = presenceMap.get(recipientId);
      const isOnline = lastSeen ? (Date.now() - lastSeen) < ONLINE_THRESHOLD : false;
      const openTask = openTaskMap.get(recipientId);
      const recipientHasChatOpen = isOnline && openTask === Number(taskId);

      if (!recipientHasChatOpen) {
        await sb.from("lp_notifications").insert({
          user_id: recipientId,
          title: "New Task Message",
          message: `${user.name}: ${message.trim().substring(0, 80)}${message.trim().length > 80 ? "..." : ""}`,
          type: "task_message",
          is_read: false,
          task_id: Number(taskId),
        });
      }
    }

    return NextResponse.json({
      ...msgEntity,
      createdAt: msgEntity.createdAt instanceof Date ? msgEntity.createdAt.toISOString() : msgEntity.createdAt,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "employee");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { taskId } = body;
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    const db = await getDB();
    const repo = db.getRepository(TaskMessage);

    // Mark messages as read where the current user is NOT the sender
    await repo
      .createQueryBuilder()
      .update(TaskMessage)
      .set({ isRead: true })
      .where('"taskId" = :taskId', { taskId: Number(taskId) })
      .andWhere('"senderId" != :userId', { userId: user.id })
      .andWhere('"isRead" = false')
      .execute();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
