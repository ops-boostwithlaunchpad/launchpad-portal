import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { AgentEntity } from "@/entity/AgentEntity";
import { Agency } from "@/entity/Agency";
import { User } from "@/entity/User";
import { requireRole } from "@/lib/apiAuth";
import { In } from "typeorm";

// Helper: join agent records with user data and return combined shape
async function getAgentsWithUsers(db: Awaited<ReturnType<typeof getDB>>, where?: Record<string, unknown>) {
  const agentRepo = db.getRepository(AgentEntity);
  const userRepo = db.getRepository(User);

  const agents = where ? await agentRepo.findBy(where) : await agentRepo.find();
  const userIds = agents.map((a) => a.userId).filter(Boolean) as number[];
  const users = userIds.length > 0
    ? await userRepo.findBy({ id: In(userIds) })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return agents.map((a) => {
    const u = a.userId ? userMap.get(a.userId) : null;
    return {
      id: a.id,
      name: u?.name || "",
      email: u?.email || "",
      agency: a.agency,
      closed: a.closed,
      mrr: a.mrr,
      commission: a.commission,
      month: a.month,
      status: a.status,
    };
  });
}

export async function GET() {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();

    // Agency role: only see agents under their agency
    if (user!.role === "agency") {
      const agency = await db.getRepository(Agency).findOneBy({ userId: user!.id });
      if (!agency) return NextResponse.json([]);
      const agents = await getAgentsWithUsers(db, { agency: agency.agency });
      return NextResponse.json(agents);
    }

    // Agent role: only see themselves
    if (user!.role === "agent") {
      const agent = await db.getRepository(AgentEntity).findOneBy({ userId: user!.id });
      if (!agent) return NextResponse.json([]);
      const agents = await getAgentsWithUsers(db, { id: agent.id });
      return NextResponse.json(agents);
    }

    const agents = await getAgentsWithUsers(db);
    return NextResponse.json(agents);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const body = await request.json();
    const { name, email, password, agency, closed, mrr, commission, month, status } = body;

    // Create user record
    const userRepo = db.getRepository(User);
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const newUser = await userRepo.save(
      userRepo.create({ name, email, password: password || "", role: "agent" })
    );

    // Create agent record linked to user
    const agentRepo = db.getRepository(AgentEntity);
    const newAgent = await agentRepo.save(
      agentRepo.create({
        userId: newUser.id,
        agency: agency || "Solo",
        closed: closed || 0,
        mrr: mrr || 0,
        commission: commission || 0,
        month: month || 0,
        status: status || "Active",
      })
    );

    return NextResponse.json({
      id: newAgent.id,
      name: newUser.name,
      email: newUser.email,
      agency: newAgent.agency,
      closed: newAgent.closed,
      mrr: newAgent.mrr,
      commission: newAgent.commission,
      month: newAgent.month,
      status: newAgent.status,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const body = await request.json();
    const { id, name, email, password, agency, closed, mrr, commission, month, status } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const agentRepo = db.getRepository(AgentEntity);
    const agent = await agentRepo.findOneBy({ id });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Update agent domain data
    if (agency !== undefined) agent.agency = agency;
    if (closed !== undefined) agent.closed = closed;
    if (mrr !== undefined) agent.mrr = mrr;
    if (commission !== undefined) agent.commission = commission;
    if (month !== undefined) agent.month = month;
    if (status !== undefined) agent.status = status;
    await agentRepo.save(agent);

    // Update linked user data
    let userName = "";
    let userEmail = "";
    if (agent.userId) {
      const userRepo = db.getRepository(User);
      const user = await userRepo.findOneBy({ id: agent.userId });
      if (user) {
        if (name) user.name = name;
        if (email) user.email = email;
        if (password) user.password = password;
        await userRepo.save(user);
        userName = user.name;
        userEmail = user.email;
      }
    }

    return NextResponse.json({
      id: agent.id,
      name: userName,
      email: userEmail,
      agency: agent.agency,
      closed: agent.closed,
      mrr: agent.mrr,
      commission: agent.commission,
      month: agent.month,
      status: agent.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales");
  if (error) return error;
  try {
    const db = await getDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const agentRepo = db.getRepository(AgentEntity);
    const agent = await agentRepo.findOneBy({ id: Number(id) });

    // Delete user record if linked
    if (agent?.userId) {
      await db.getRepository(User).delete({ id: agent.userId, role: "agent" });
    }

    await agentRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
