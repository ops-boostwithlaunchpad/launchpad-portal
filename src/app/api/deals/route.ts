import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Deal } from "@/entity/Deal";
import { Client } from "@/entity/Client";
import { Task } from "@/entity/Task";
import { Agency } from "@/entity/Agency";
import { requireRole } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";
import { createTaskForService } from "@/lib/taskCreation";

/**
 * When a deal is approved, create or update the corresponding client.
 * If client exists, append new services. If checklist complete, auto-send to backend.
 */
async function syncDealToClient(db: Awaited<ReturnType<typeof getDB>>, deal: Deal) {
  const clientRepo = db.getRepository(Client);
  const taskRepo = db.getRepository(Task);

  let client = await clientRepo.findOneBy({ email: deal.email });

  if (client) {
    // Append new services from this deal
    const newServices = deal.services.filter((s) => !client!.services.includes(s));
    if (newServices.length > 0) {
      client.services = [...client.services, ...newServices];
    }
    // Update fields from deal
    client.name = deal.client || client.name;
    client.industry = deal.industry || client.industry;
    client.contact = deal.contact || client.contact;
    client.email = deal.email || client.email;
    client.website = deal.website || client.website;
    client.mrr = client.mrr + deal.mrr;
    client.rep = deal.rep || client.rep;
    // Update checklist (only set to true, never revert)
    if (deal.stripePaymentDone) client.stripePaymentDone = true;
    if (deal.onboardingFormFilled) client.onboardingFormFilled = true;
    if (deal.agreementSigned) client.agreementSigned = true;

    await clientRepo.save(client);

    // Create tasks for newly added services if already sent to backend
    if (client.sentToBackend && newServices.length > 0) {
      for (const svc of newServices) {
        await createTaskForService(db, client, svc, "");
      }
    }
  } else {
    // Create new client
    client = await clientRepo.save({
      name: deal.client,
      industry: deal.industry,
      contact: deal.contact || "",
      email: deal.email || "",
      services: deal.services,
      mrr: deal.mrr,
      start: new Date().toISOString().slice(0, 10),
      rep: deal.rep || deal.agent || "Launchpad",
      website: deal.website || "",
      status: "Active",
      stripePaymentDone: deal.stripePaymentDone,
      onboardingFormFilled: deal.onboardingFormFilled,
      agreementSigned: deal.agreementSigned,
      sentToBackend: false,
    });
  }

  // Auto-send to backend if all checklist items checked
  if (
    client.stripePaymentDone &&
    client.onboardingFormFilled &&
    client.agreementSigned &&
    !client.sentToBackend
  ) {
    for (const svc of client.services) {
      const existing = await taskRepo.findOneBy({ clientId: client.id, service: svc });
      if (!existing) {
        await createTaskForService(db, client, svc, "onboarding");
      }
    }
    client.sentToBackend = true;
    await clientRepo.save(client);
  }
}

export async function GET() {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "agent", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const dealRepo = db.getRepository(Deal);

    // Agency: only deals with their agencyId
    if (user!.role === "agency") {
      const agency = await db.getRepository(Agency).findOneBy({ userId: user!.id });
      if (!agency) return NextResponse.json([]);
      const deals = await dealRepo.findBy({ agencyId: agency.id });
      return NextResponse.json(deals);
    }

    // Agent: only their own deals
    if (user!.role === "agent") {
      const deals = await dealRepo.findBy({ agent: user!.name });
      return NextResponse.json(deals);
    }

    const deals = await dealRepo.find();
    return NextResponse.json(deals);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const dealRepo = db.getRepository(Deal);
    const body = await request.json();
    const { id, ...data } = body;

    // Agency-submitted deals start as Pending; admin/sales deals are auto-approved
    if (user!.role === "agency") {
      data.approval = "Pending";
      data.submittedBy = user!.name;
      const agency = await db.getRepository(Agency).findOneBy({ userId: user!.id });
      if (agency) data.agencyId = agency.id;
    } else {
      data.approval = "Approved";
    }

    const newDeal = await dealRepo.save(data);

    // Admin/sales deals are auto-approved — sync to client immediately
    if (newDeal.approval === "Approved") {
      await syncDealToClient(db, newDeal);
    }

    // Notify admin when agency submits a deal
    if (user!.role === "agency") {
      const sb = getSupabase();
      if (sb) {
        await sb.from("lp_notifications").insert({
          user_id: 0,
          title: "New Deal Submitted",
          message: `${user!.name} submitted a new deal: ${data.client} ($${data.mrr}/mo)`,
          type: "deal_pending",
        });
      }
    }

    return NextResponse.json(newDeal, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;
  try {
    const db = await getDB();
    const dealRepo = db.getRepository(Deal);
    const body = await request.json();
    const { id, approval, rejectionReason } = body;

    if (!id || !approval) {
      return NextResponse.json({ error: "Missing id or approval status" }, { status: 400 });
    }

    const deal = await dealRepo.findOneBy({ id });
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    deal.approval = approval;
    deal.rejectionReason = approval === "Rejected" ? (rejectionReason || null) : null;

    const updated = await dealRepo.save(deal);

    // When approved, sync deal to client (create/update client + backend tasks)
    if (approval === "Approved") {
      await syncDealToClient(db, updated);
    }

    // Notify the agency that submitted the deal
    if (deal.agencyId) {
      const sb = getSupabase();
      if (sb) {
        const agency = await db.getRepository(Agency).findOneBy({ id: deal.agencyId });
        if (agency?.userId) {
          const isApproved = approval === "Approved";
          await sb.from("lp_notifications").insert({
            user_id: agency.userId,
            title: isApproved ? "Deal Approved" : "Deal Rejected",
            message: isApproved
              ? `Your deal "${deal.client}" has been approved`
              : `Your deal "${deal.client}" was rejected${rejectionReason ? `: ${rejectionReason}` : ""}`,
            type: isApproved ? "deal_approved" : "deal_rejected",
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireRole("admin", "subadmin", "sales", "agency");
  if (error) return error;
  try {
    const db = await getDB();
    const dealRepo = db.getRepository(Deal);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Agency edits reset approval to Pending
    if (user!.role === "agency") {
      data.approval = "Pending";
    }

    await dealRepo.update(id, data);
    const updated = await dealRepo.findOneBy({ id });

    // Sync changes to client when deal is approved (e.g. checklist edits)
    if (updated && updated.approval === "Approved") {
      await syncDealToClient(db, updated);
    }

    // Notify admin when agency edits a deal
    if (user!.role === "agency") {
      const sb = getSupabase();
      if (sb) {
        await sb.from("lp_notifications").insert({
          user_id: 0,
          title: "Deal Updated",
          message: `${user!.name} edited deal: ${updated?.client} — awaiting re-approval`,
          type: "deal_pending",
        });
      }
    }

    return NextResponse.json(updated);
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
    const dealRepo = db.getRepository(Deal);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await dealRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
