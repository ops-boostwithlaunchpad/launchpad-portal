import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Deal } from "@/entity/Deal";
import { AgentEntity } from "@/entity/AgentEntity";
import { requireRole } from "@/lib/apiAuth";
import { MoreThan } from "typeorm";

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  try {
    const db = await getDB();
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const dealWhere: Record<string, unknown> = { approval: "Pending" };
    const agentWhere: Record<string, unknown> = { approval: "Pending" };

    if (since) {
      dealWhere.createdAt = MoreThan(new Date(since));
      agentWhere.createdAt = MoreThan(new Date(since));
    }

    const [dealCount, agentCount] = await Promise.all([
      db.getRepository(Deal).count({ where: dealWhere }),
      db.getRepository(AgentEntity).count({ where: agentWhere }),
    ]);

    return NextResponse.json({ count: dealCount + agentCount });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
