import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Task } from "@/entity/Task";
import { ClientAccount } from "@/entity/ClientAccount";
import { requireRole } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales", "backend", "employee", "client");
  if (error) return error;
  try {
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");
    const assignedTo = searchParams.get("assignedTo");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (team) where.team = team;
    if (assignedTo) where.assignedTo = Number(assignedTo);
    if (status) where.status = status;

    const tasks = await taskRepo.find({ where });

    return NextResponse.json(tasks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales", "backend", "employee");
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
  const { error } = await requireRole("admin", "subadmin", "backend", "employee");
  if (error) return error;
  try {
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    const body = await request.json();
    const { id, status, log, assignedTo, assignedToName } = body;

    const task = await taskRepo.findOneBy({ id });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Track what changed for notifications
    const wasAssigned = assignedTo !== undefined && task.assignedTo !== assignedTo;
    const statusChanged = status && task.status !== status;

    if (status) {
      task.status = status;
    }

    if (log) {
      task.logs.push(log);
    }

    if (assignedTo !== undefined) {
      task.assignedTo = assignedTo;
    }
    if (assignedToName !== undefined) {
      task.assignedToName = assignedToName;
    }

    const updated = await taskRepo.save(task);

    // Create notifications via Supabase (triggers Realtime) — skip if Supabase not configured
    const sb = getSupabase();
    if (sb) {
      // Look up client account for client notifications
      const clientAccount = await db.getRepository(ClientAccount).findOneBy({ name: task.client });
      const clientUserId = clientAccount?.id;

      if (wasAssigned && assignedTo) {
        // Notify the assigned employee
        await sb.from("lp_notifications").insert({
          user_id: assignedTo,
          title: "Task Assigned",
          message: `New task assigned: ${task.service} for ${task.client}`,
          type: "task_assigned",
          task_id: task.id,
        });

        // Notify the client that an employee was assigned
        if (clientUserId) {
          await sb.from("lp_notifications").insert({
            user_id: clientUserId,
            title: "Team Member Assigned",
            message: `${assignedToName || "A team member"} has been assigned to your ${task.service} task`,
            type: "task_assigned",
            task_id: task.id,
          });
        }
      }

      if (statusChanged && (status === "In Progress" || status === "Done")) {
        const currentUser = await getCurrentUser();
        const userName = currentUser?.name || "An employee";
        const action = status === "In Progress" ? "started" : "completed";

        // Notify admin
        await sb.from("lp_notifications").insert({
          user_id: 0,
          title: `Task ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          message: `${userName} ${action}: ${task.service} for ${task.client}`,
          type: status === "In Progress" ? "task_started" : "task_completed",
          task_id: task.id,
        });

        // Notify the client about status change
        if (clientUserId) {
          await sb.from("lp_notifications").insert({
            user_id: clientUserId,
            title: `Task ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            message: `Your ${task.service} task has been ${action}`,
            type: status === "In Progress" ? "task_started" : "task_completed",
            task_id: task.id,
          });
        }
      }
    }

    // Trigger n8n webhook when task is marked complete
    if (statusChanged && status === "Done") {
      const currentUser = await getCurrentUser().catch(() => null);
      fetch("https://n8n.launchpadautomation.com/webhook-test/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          client: task.client,
          service: task.service,
          team: task.team,
          assignedTo: task.assignedTo,
          assignedToName: task.assignedToName,
          completedBy: currentUser?.name || "Unknown",
          completedAt: new Date().toISOString(),
        }),
      }).catch(() => {}); // fire-and-forget, don't block response
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "backend", "employee");
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
