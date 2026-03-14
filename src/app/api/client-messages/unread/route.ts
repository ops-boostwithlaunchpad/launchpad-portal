import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { ClientMessage } from "@/entity/ClientMessage";
import { requireRole } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const { error } = await requireRole("admin", "subadmin", "client");
  if (error) return error;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDB();
    const isAdmin = user.role === "admin" || user.role === "subadmin";

    if (isAdmin) {
      // Admin: get unread counts per client thread + last message timestamps
      const unreadRows = await db
        .getRepository(ClientMessage)
        .createQueryBuilder("m")
        .where("m.senderRole = :role", { role: "client" })
        .andWhere("m.isRead = false")
        .select("m.clientUserId", "clientUserId")
        .addSelect("COUNT(m.id)", "count")
        .groupBy("m.clientUserId")
        .getRawMany();

      const perClient: Record<number, number> = {};
      let totalCount = 0;
      for (const row of unreadRows) {
        perClient[row.clientUserId] = Number(row.count);
        totalCount += Number(row.count);
      }

      // Last message timestamp per client (for sorting)
      const lastMsgRows = await db
        .getRepository(ClientMessage)
        .createQueryBuilder("m")
        .select("m.clientUserId", "clientUserId")
        .addSelect("MAX(m.createdAt)", "lastMessageAt")
        .groupBy("m.clientUserId")
        .getRawMany();

      const lastMessageAt: Record<number, string> = {};
      for (const row of lastMsgRows) {
        lastMessageAt[row.clientUserId] = row.lastMessageAt;
      }

      return NextResponse.json({ count: totalCount, perClient, lastMessageAt });
    } else {
      // Client: get their own unread count (messages from admin)
      const count = await db
        .getRepository(ClientMessage)
        .createQueryBuilder("m")
        .where("m.clientUserId = :userId", { userId: user.id })
        .andWhere("m.senderId != :userId", { userId: user.id })
        .andWhere("m.isRead = false")
        .getCount();

      return NextResponse.json({ count });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
