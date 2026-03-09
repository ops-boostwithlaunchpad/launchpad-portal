import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Client } from "@/entity/Client";
import { Deal } from "@/entity/Deal";
import { AgentEntity } from "@/entity/AgentEntity";
import { Agency } from "@/entity/Agency";
import { User } from "@/entity/User";
import { Task } from "@/entity/Task";
import { requireRole } from "@/lib/apiAuth";
import { In } from "typeorm";
import { autoSendToBackend, createTaskForService } from "@/lib/taskCreation";

export async function GET() {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "backend", "employee", "client", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const clientRepo = db.getRepository(Client);

    // Agency: only clients from deals handled by their agents
    if (user!.role === "agency") {
      const agency = await db.getRepository(Agency).findOneBy({ userId: user!.id });
      if (!agency) return NextResponse.json([]);
      const agents = await db.getRepository(AgentEntity).findBy({ agency: agency.agency });
      const userIds = agents.map((a) => a.userId).filter(Boolean) as number[];
      if (userIds.length === 0) return NextResponse.json([]);
      const users = await db.getRepository(User).find({ where: userIds.map((id) => ({ id })), select: ["id", "name"] });
      const agentNames = users.map((u) => u.name);
      const deals = await db.getRepository(Deal).find({ where: agentNames.map((n) => ({ agent: n })) });
      const clientNames = [...new Set(deals.map((d) => d.client))];
      if (clientNames.length === 0) return NextResponse.json([]);
      const clients = await clientRepo.find({ where: clientNames.map((n) => ({ name: n })) });
      return NextResponse.json(clients);
    }

    // Agent: only clients from their deals
    if (user!.role === "agent") {
      const deals = await db.getRepository(Deal).findBy({ agent: user!.name });
      const clientNames = [...new Set(deals.map((d) => d.client))];
      if (clientNames.length === 0) return NextResponse.json([]);
      const clients = await clientRepo.find({ where: clientNames.map((n) => ({ name: n })) });
      return NextResponse.json(clients);
    }

    const clients = await clientRepo.find();
    return NextResponse.json(clients);
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
    const clientRepo = db.getRepository(Client);
    const body = await request.json();
    const { id, ...data } = body;
    const newClient = await clientRepo.save(data);
    await autoSendToBackend(db, newClient);
    const saved = await clientRepo.findOneBy({ id: newClient.id });
    return NextResponse.json(saved, { status: 201 });
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
    const clientRepo = db.getRepository(Client);
    const taskRepo = db.getRepository(Task);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await clientRepo.findOneBy({ id });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const oldServices: string[] = existing.services || [];
    const oldName = existing.name;

    await clientRepo.update(id, data);
    const updated = await clientRepo.findOneBy({ id });

    if (updated) {
      const newServices: string[] = updated.services || [];

      // Delete tasks for removed services
      const removedServices = oldServices.filter((s) => !newServices.includes(s));
      if (removedServices.length > 0) {
        await taskRepo.delete({
          clientId: updated.id,
          service: In(removedServices),
        });
      }

      // If client name changed, update all their tasks
      if (oldName !== updated.name) {
        await taskRepo.update({ clientId: updated.id }, { client: updated.name });
      }

      // Create tasks for newly added services (if already sent to backend)
      if (updated.sentToBackend) {
        const addedServices = newServices.filter((s) => !oldServices.includes(s));
        for (const svc of addedServices) {
          await createTaskForService(db, updated, svc, "");
        }
      }

      await autoSendToBackend(db, updated);
    }

    const final = await clientRepo.findOneBy({ id });
    return NextResponse.json(final);
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
    const clientRepo = db.getRepository(Client);
    const taskRepo = db.getRepository(Task);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    // Delete all tasks linked to this client
    await taskRepo.delete({ clientId: Number(id) });

    await clientRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
