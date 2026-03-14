import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { ClientMessage } from "@/entity/ClientMessage";
import { User } from "@/entity/User";
import { requireRole } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json([]);

    // Fetch all clients from the Supabase clients table
    const { data: supabaseClients, error: sbErr } = await sb
      .from("clients")
      .select("id, client_name, client_email, industry, status")
      .order("client_name", { ascending: true });

    if (sbErr) {
      return NextResponse.json({ error: sbErr.message }, { status: 500 });
    }

    const clients = supabaseClients || [];

    // Get all client-role users from lp_users to map emails -> user IDs for chat
    const db = await getDB();
    const clientUsers = await db
      .getRepository(User)
      .createQueryBuilder("u")
      .where("u.role = :role", { role: "client" })
      .getMany();

    const emailToUserId = new Map(clientUsers.map((u) => [u.email.toLowerCase(), u.id]));

    // Get last message + unread data per clientUserId
    const allClientUserIds = clientUsers.map((u) => u.id);

    let lastMsgMap = new Map<number, { message: string; createdAt: string }>();

    if (allClientUserIds.length > 0) {
      const lastMessages = await db
        .getRepository(ClientMessage)
        .createQueryBuilder("m")
        .where("m.clientUserId IN (:...ids)", { ids: allClientUserIds })
        .select("m.clientUserId", "clientUserId")
        .addSelect("MAX(m.id)", "lastMsgId")
        .groupBy("m.clientUserId")
        .getRawMany();

      const lastMsgIds = lastMessages.map((r: { lastMsgId: number }) => Number(r.lastMsgId));

      if (lastMsgIds.length > 0) {
        const lastMsgEntities = await db
          .getRepository(ClientMessage)
          .createQueryBuilder("m")
          .where("m.id IN (:...ids)", { ids: lastMsgIds })
          .getMany();

        for (const m of lastMsgEntities) {
          lastMsgMap.set(m.clientUserId, {
            message: m.message,
            createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
          });
        }
      }
    }

    // Build threads from Supabase clients
    const threads = clients.map((c: { id: number; client_name: string; client_email: string; industry: string; status: string }) => {
      const userId = emailToUserId.get((c.client_email || "").toLowerCase()) || null;
      const lastMsg = userId ? lastMsgMap.get(userId) : null;
      return {
        clientUserId: userId,
        supabaseClientId: c.id,
        clientName: c.client_name || "Unknown",
        clientEmail: c.client_email || "",
        industry: c.industry || "",
        status: c.status || "",
        lastMessage: lastMsg?.message || "",
        lastMessageAt: lastMsg?.createdAt || "",
        hasAccount: !!userId,
      };
    });

    return NextResponse.json(threads);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
