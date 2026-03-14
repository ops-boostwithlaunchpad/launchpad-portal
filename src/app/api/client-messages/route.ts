import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { ClientMessage } from "@/entity/ClientMessage";
import { requireRole } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { presenceMap, openClientChatMap, ONLINE_THRESHOLD } from "@/app/api/presence/route";

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "client");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientUserId = searchParams.get("clientUserId");
  if (!clientUserId) return NextResponse.json({ error: "Missing clientUserId" }, { status: 400 });

  // Clients can only fetch their own messages
  if (user.role === "client" && user.id !== Number(clientUserId)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const db = await getDB();
    const messages = await db.getRepository(ClientMessage).find({
      where: { clientUserId: Number(clientUserId) },
      order: { createdAt: "ASC" },
    });
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
  const { error } = await requireRole("admin", "subadmin", "client");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientUserId, message } = body;
    if (!clientUserId || !message?.trim()) {
      return NextResponse.json({ error: "clientUserId and message required" }, { status: 400 });
    }

    // Clients can only send to their own thread
    if (user.role === "client" && user.id !== Number(clientUserId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const db = await getDB();
    const msgEntity = await db.getRepository(ClientMessage).save({
      clientUserId: Number(clientUserId),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      message: message.trim(),
      isRead: false,
    });

    // Send notification
    const sb = getSupabase();
    if (sb) {
      if (user.role === "client") {
        // Client messaging admin — notify admin if they don't have this chat open
        const recipientId = 0;
        const lastSeen = presenceMap.get(recipientId);
        const isOnline = lastSeen ? (Date.now() - lastSeen) < ONLINE_THRESHOLD : false;
        const openChat = openClientChatMap.get(recipientId);
        const recipientHasChatOpen = isOnline && openChat === Number(clientUserId);

        if (!recipientHasChatOpen) {
          await sb.from("lp_notifications").insert({
            user_id: recipientId,
            title: "New Client Message",
            message: `${user.name}: ${message.trim().substring(0, 80)}${message.trim().length > 80 ? "..." : ""}`,
            type: "client_message",
            is_read: false,
          });
        }
      } else {
        // Admin messaging client — notify client
        const recipientId = Number(clientUserId);
        const lastSeen = presenceMap.get(recipientId);
        const isOnline = lastSeen ? (Date.now() - lastSeen) < ONLINE_THRESHOLD : false;
        const openChat = openClientChatMap.get(recipientId);
        const recipientHasChatOpen = isOnline && openChat === Number(clientUserId);

        if (!recipientHasChatOpen) {
          await sb.from("lp_notifications").insert({
            user_id: recipientId,
            title: "Message from Admin",
            message: `${user.name}: ${message.trim().substring(0, 80)}${message.trim().length > 80 ? "..." : ""}`,
            type: "client_message",
            is_read: false,
          });
        }
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
  const { error } = await requireRole("admin", "subadmin", "client");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientUserId } = body;
    if (!clientUserId) return NextResponse.json({ error: "clientUserId required" }, { status: 400 });

    const db = await getDB();
    const repo = db.getRepository(ClientMessage);

    await repo
      .createQueryBuilder()
      .update(ClientMessage)
      .set({ isRead: true })
      .where('"clientUserId" = :clientUserId', { clientUserId: Number(clientUserId) })
      .andWhere('"senderId" != :userId', { userId: user.id })
      .andWhere('"isRead" = false')
      .execute();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
