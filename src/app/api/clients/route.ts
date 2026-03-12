import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Deal } from "@/entity/Deal";
import { AgentEntity } from "@/entity/AgentEntity";
import { Agency } from "@/entity/Agency";
import { User } from "@/entity/User";
import { Task } from "@/entity/Task";
import { requireRole } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";
import { In } from "typeorm";
import { createTaskForService } from "@/lib/taskCreation";

/** Map snake_case / lowercase service names to display names */
const SERVICE_NAME_MAP: Record<string, string> = {
  local_seo: "Local SEO",
  "local seo": "Local SEO",
  ai_seo: "AI SEO",
  "ai seo": "AI SEO",
  lsa: "LSA",
  "local service ads": "LSA",
  google_ads: "Google Ads",
  "google ads": "Google Ads",
  meta_ads: "Meta Ads",
  "meta ads": "Meta Ads",
  automation: "Automation",
};

function mapServiceName(s: string): string {
  const trimmed = s.trim();
  return SERVICE_NAME_MAP[trimmed.toLowerCase()] || trimmed;
}

/** Normalize services from various formats into a clean string array */
function normalizeServices(services: string[] | string | undefined | null): string[] {
  if (!services) return [];

  let items: string[];

  if (typeof services === "string") {
    // Try JSON parse first (e.g. '["AI SEO","LSA"]')
    try {
      const parsed = JSON.parse(services);
      if (Array.isArray(parsed)) { items = parsed; }
      else { items = services.split(","); }
    } catch {
      // Plain comma-separated string like "ai_seo, local_seo, lsa"
      items = services.split(",");
    }
  } else if (Array.isArray(services)) {
    // Postgres array comes as a real array from Supabase
    items = services.flatMap((s) => {
      const str = String(s);
      if (str.startsWith("[")) {
        try { return JSON.parse(str); } catch { /* fall through */ }
      }
      return str.split(",");
    });
  } else {
    return [];
  }

  return items
    .map((s) => String(s).replace(/^\[?"?|"?\]?$/g, "").trim())
    .filter(Boolean)
    .map(mapServiceName);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Map a Supabase clients row to the Client interface the frontend expects */
function mapRow(row: any) {
  return {
    id: row.id,
    name: row.client_name || "",
    industry: row.industry || "",
    contact: row.client_phone || "",
    email: row.client_email || "",
    services: normalizeServices(row.services_interested),
    mrr: row.monthly_price || 0,
    start: row.created_at || "",
    rep: row.salesperson || "",
    website: row.website || "",
    status: row.status || "Active",
    stripePaymentDone: row.payment_status === "paid",
    onboardingFormFilled: row.onboarding_form_completed === true,
    agreementSigned: row.agreement_signed === true,
    sentToBackend: row.onboarding_status === "sent_to_backend",
  };
}

export async function GET() {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "backend", "employee", "client", "agent", "agency");
  if (error) return error;

  const sb = getSupabase();
  if (!sb) return NextResponse.json([]);

  try {
    // Agency: only clients from deals handled by their agents
    if (user!.role === "agency" || user!.role === "agent") {
      const db = await getDB();

      let clientNames: string[] = [];

      if (user!.role === "agency") {
        const agency = await db.getRepository(Agency).findOneBy({ userId: user!.id });
        if (!agency) return NextResponse.json([]);
        const agents = await db.getRepository(AgentEntity).findBy({ agency: agency.agency });
        const userIds = agents.map((a) => a.userId).filter(Boolean) as number[];
        if (userIds.length === 0) return NextResponse.json([]);
        const users = await db.getRepository(User).find({ where: userIds.map((id) => ({ id })), select: ["id", "name"] });
        const agentNames = users.map((u) => u.name);
        const deals = await db.getRepository(Deal).find({ where: agentNames.map((n) => ({ agent: n })) });
        clientNames = [...new Set(deals.map((d) => d.client))];
      } else {
        const deals = await db.getRepository(Deal).findBy({ agent: user!.name });
        clientNames = [...new Set(deals.map((d) => d.client))];
      }

      if (clientNames.length === 0) return NextResponse.json([]);

      const { data } = await sb
        .from("clients")
        .select("*")
        .in("client_name", clientNames);

      return NextResponse.json((data || []).map(mapRow));
    }

    // All other roles: return all clients
    const { data } = await sb.from("clients").select("*");
    return NextResponse.json((data || []).map(mapRow));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales");
  if (error) return error;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const services = normalizeServices(body.services);

    const proposalId = `PROP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const insertData: any = {
      proposal_id: proposalId,
      client_name: body.name,
      industry: body.industry || null,
      client_phone: body.contact || null,
      client_email: body.email || null,
      services_interested: services.length > 0 ? services : null,
      monthly_price: body.mrr || 0,
      salesperson: body.rep || null,
      website: body.website || null,
      status: (body.status || "active").toLowerCase(),
      company_name: body.companyName || null,
      location: body.location || null,
      pain_points: body.painPoints || null,
      setup_fee: body.setupFee || 0,
      payment_status: body.stripePaymentDone ? "paid" : null,
      onboarding_form_completed: body.onboardingFormFilled || false,
      agreement_signed: body.agreementSigned || false,
      onboarding_status: body.stripePaymentDone && body.onboardingFormFilled && body.agreementSigned ? "sent_to_backend" : null,
    };

    console.log("Inserting client into Supabase:", JSON.stringify(insertData));

    const { data, error: sbError } = await sb
      .from("clients")
      .insert(insertData)
      .select()
      .single();

    if (sbError) {
      console.error("Supabase insert error:", sbError);
      return NextResponse.json({ error: sbError.message }, { status: 500 });
    }

    console.log("Client inserted successfully:", data);
    return NextResponse.json(mapRow(data), { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales");
  if (error) return error;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Get existing client for comparison
    const { data: existing } = await sb
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const services = rest.services ? normalizeServices(rest.services) : undefined;

    const updateData: any = {};
    if (rest.name !== undefined) updateData.client_name = rest.name;
    if (rest.industry !== undefined) updateData.industry = rest.industry;
    if (rest.contact !== undefined) updateData.client_phone = rest.contact;
    if (rest.email !== undefined) updateData.client_email = rest.email;
    if (services !== undefined) updateData.services_interested = services;
    if (rest.mrr !== undefined) updateData.monthly_price = rest.mrr;
    if (rest.rep !== undefined) updateData.salesperson = rest.rep;
    if (rest.website !== undefined) updateData.website = rest.website;
    if (rest.status !== undefined) updateData.status = rest.status;

    const { data: updated, error: sbError } = await sb
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (sbError) {
      return NextResponse.json({ error: sbError.message }, { status: 500 });
    }

    // Handle task updates if services changed
    if (services !== undefined) {
      const db = await getDB();
      const taskRepo = db.getRepository(Task);
      const oldServices = normalizeServices(existing.services_interested);
      const newServices = services;

      // Delete tasks for removed services
      const removedServices = oldServices.filter((s) => !newServices.includes(s));
      if (removedServices.length > 0) {
        await taskRepo.delete({
          clientId: id,
          service: In(removedServices),
        });
      }

      // If client name changed, update all their tasks
      const oldName = existing.client_name;
      const newName = rest.name || existing.client_name;
      if (oldName !== newName) {
        await taskRepo.update({ clientId: id }, { client: newName });
      }

      // Create tasks for newly added services (if already sent to backend)
      if (existing.onboarding_status === "sent_to_backend") {
        const addedServices = newServices.filter((s) => !oldServices.includes(s));
        for (const svc of addedServices) {
          await createTaskForService(db, { id, name: newName }, svc, "");
        }
      }
    }

    return NextResponse.json(mapRow(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales");
  if (error) return error;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    // Delete all tasks linked to this client
    const db = await getDB();
    const taskRepo = db.getRepository(Task);
    await taskRepo.delete({ clientId: Number(id) });

    // Delete from Supabase
    const { error: sbError } = await sb
      .from("clients")
      .delete()
      .eq("id", Number(id));

    if (sbError) {
      return NextResponse.json({ error: sbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
