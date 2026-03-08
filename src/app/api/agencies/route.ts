import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Agency } from "@/entity/Agency";
import { User } from "@/entity/User";
import { requireRole } from "@/lib/apiAuth";
import { In } from "typeorm";

// Helper: join agency records with user data
async function getAgenciesWithUsers(db: Awaited<ReturnType<typeof getDB>>, where?: Record<string, unknown>) {
  const agencyRepo = db.getRepository(Agency);
  const userRepo = db.getRepository(User);

  const agencies = where ? await agencyRepo.findBy(where) : await agencyRepo.find();
  const userIds = agencies.map((a) => a.userId).filter(Boolean) as number[];
  const users = userIds.length > 0 ? await userRepo.findBy({ id: In(userIds) }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return agencies.map((a) => {
    const u = a.userId ? userMap.get(a.userId) : null;
    return {
      id: a.id,
      name: u?.name || "",
      email: u?.email || "",
      agency: a.agency,
      agents: a.agents,
      clients: a.clients,
      mrr: a.mrr,
      commission: a.commission,
      status: a.status,
    };
  });
}

export async function GET() {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();

    // Agency role: only see their own agency
    if (user!.role === "agency") {
      const agency = await db.getRepository(Agency).findOneBy({ userId: user!.id });
      if (!agency) return NextResponse.json([]);
      const agencies = await getAgenciesWithUsers(db, { id: agency.id });
      return NextResponse.json(agencies);
    }

    // Agent role: see the agency they belong to
    if (user!.role === "agent") {
      const { AgentEntity } = await import("@/entity/AgentEntity");
      const agent = await db.getRepository(AgentEntity).findOneBy({ userId: user!.id });
      if (!agent) return NextResponse.json([]);
      const agencies = await getAgenciesWithUsers(db, { agency: agent.agency });
      return NextResponse.json(agencies);
    }

    const agencies = await getAgenciesWithUsers(db);
    return NextResponse.json(agencies);
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
    const { name, email, password, agency, agents, clients, mrr, commission, status } = body;

    // Create user record
    const userRepo = db.getRepository(User);
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const newUser = await userRepo.save(
      userRepo.create({ name, email, password: password || "", role: "agency" })
    );

    // Create agency record linked to user
    const agencyRepo = db.getRepository(Agency);
    const newAgency = await agencyRepo.save(
      agencyRepo.create({
        userId: newUser.id,
        agency: agency || "",
        agents: agents || 0,
        clients: clients || 0,
        mrr: mrr || 0,
        commission: commission || 0,
        status: status || "Onboarding",
      })
    );

    return NextResponse.json({
      id: newAgency.id,
      name: newUser.name,
      email: newUser.email,
      agency: newAgency.agency,
      agents: newAgency.agents,
      clients: newAgency.clients,
      mrr: newAgency.mrr,
      commission: newAgency.commission,
      status: newAgency.status,
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
    const { id, name, email, password, agency, commission } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const agencyRepo = db.getRepository(Agency);
    const agencyRecord = await agencyRepo.findOneBy({ id });
    if (!agencyRecord) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    // Update agency domain data
    if (agency !== undefined) agencyRecord.agency = agency;
    if (commission !== undefined) agencyRecord.commission = commission;
    await agencyRepo.save(agencyRecord);

    // Update linked user data
    let userName = "";
    let userEmail = "";
    if (agencyRecord.userId) {
      const userRepo = db.getRepository(User);
      const user = await userRepo.findOneBy({ id: agencyRecord.userId });
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
      id: agencyRecord.id,
      name: userName,
      email: userEmail,
      agency: agencyRecord.agency,
      agents: agencyRecord.agents,
      clients: agencyRecord.clients,
      mrr: agencyRecord.mrr,
      commission: agencyRecord.commission,
      status: agencyRecord.status,
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

    const agencyRepo = db.getRepository(Agency);
    const agency = await agencyRepo.findOneBy({ id: Number(id) });

    // Delete user record if linked
    if (agency?.userId) {
      await db.getRepository(User).delete({ id: agency.userId, role: "agency" });
    }

    await agencyRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
