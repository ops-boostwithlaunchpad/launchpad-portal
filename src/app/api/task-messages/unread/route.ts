import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { TaskMessage } from "@/entity/TaskMessage";
import { Task } from "@/entity/Task";
import { requireRole } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const { error } = await requireRole("admin", "subadmin", "employee");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDB();
    const isAdmin = user.role === "admin" || user.role === "subadmin";

    // Get per-task unread counts + last message timestamp
    const qb = db
      .getRepository(TaskMessage)
      .createQueryBuilder("m")
      .innerJoin(Task, "t", "t.id = m.taskId")
      .where("t.assignedTo IS NOT NULL");

    if (isAdmin) {
      qb.andWhere("m.senderId != :userId", { userId: user.id })
        .andWhere("m.senderRole = :empRole", { empRole: "employee" });
    } else {
      qb.andWhere("t.assignedTo = :userId", { userId: user.id })
        .andWhere("m.senderId != :userId", { userId: user.id });
    }

    // Unread per task
    const unreadRows = await qb
      .andWhere("m.isRead = false")
      .select("m.taskId", "taskId")
      .addSelect("COUNT(m.id)", "count")
      .groupBy("m.taskId")
      .getRawMany();

    const perTask: Record<number, number> = {};
    let totalCount = 0;
    for (const row of unreadRows) {
      perTask[row.taskId] = Number(row.count);
      totalCount += Number(row.count);
    }

    // Last message timestamp per task (for sorting — all messages, not just unread)
    const lastMsgRows = await db
      .getRepository(TaskMessage)
      .createQueryBuilder("m")
      .innerJoin(Task, "t", "t.id = m.taskId")
      .where("t.assignedTo IS NOT NULL")
      .select("m.taskId", "taskId")
      .addSelect("MAX(m.createdAt)", "lastMessageAt")
      .groupBy("m.taskId")
      .getRawMany();

    const lastMessageAt: Record<number, string> = {};
    for (const row of lastMsgRows) {
      lastMessageAt[row.taskId] = row.lastMessageAt;
    }

    return NextResponse.json({ count: totalCount, perTask, lastMessageAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
