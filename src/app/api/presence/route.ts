import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";

// In-memory presence map: userId → last heartbeat timestamp
export const presenceMap = new Map<number, number>();
// userId → currently open task chat ID
export const openTaskMap = new Map<number, number>();
// userId → currently open client chat (clientUserId)
export const openClientChatMap = new Map<number, number>();

export const ONLINE_THRESHOLD = 30_000; // 30 seconds

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "employee", "client");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const { openTaskId, openClientChatId } = body;

    presenceMap.set(user.id, Date.now());

    if (openTaskId) {
      openTaskMap.set(user.id, openTaskId);
    } else {
      openTaskMap.delete(user.id);
    }

    if (openClientChatId) {
      openClientChatMap.set(user.id, openClientChatId);
    } else {
      openClientChatMap.delete(user.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "employee", "client");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userIds = searchParams.get("userIds");

  if (!userIds) return NextResponse.json({});

  const ids = userIds.split(",").map(Number).filter(Boolean);
  const now = Date.now();
  const result: Record<number, { online: boolean; openTaskId: number | null }> = {};

  for (const id of ids) {
    const lastSeen = presenceMap.get(id);
    const online = lastSeen ? (now - lastSeen) < ONLINE_THRESHOLD : false;
    const openTaskId = openTaskMap.get(id) || null;
    result[id] = { online, openTaskId: online ? openTaskId : null };
  }

  return NextResponse.json(result);
}
