import { getDB } from "@/lib/db";
import { Log } from "@/entity/Log";

export type LogCategory =
  | "system"
  | "employees"
  | "payments"
  | "tasks"
  | "emails"
  | "errors"
  | "deals"
  | "clients"
  | "auth";

interface LogEventParams {
  event: string;
  category: LogCategory;
  message: string;
  userId?: string | number | null;
  userName?: string | null;
  userRole?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logEvent(params: LogEventParams) {
  try {
    const db = await getDB();
    const logRepo = db.getRepository(Log);
    await logRepo.save({
      event: params.event,
      category: params.category,
      message: params.message,
      userId: params.userId != null ? String(params.userId) : null,
      userName: params.userName || null,
      userRole: params.userRole || null,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}
