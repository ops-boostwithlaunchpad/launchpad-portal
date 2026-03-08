import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Deal } from "@/entity/Deal";
import { Agency } from "@/entity/Agency";
import { requireRole } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";

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
