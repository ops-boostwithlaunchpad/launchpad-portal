import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { Log } from "@/entity/Log";
import { requireRole } from "@/lib/apiAuth";
import { Between, ILike, In, FindOptionsWhere } from "typeorm";

// Map filter tab keys to actual DB category values
// This ensures tabs match both portal-generated and n8n-generated categories
const CATEGORY_MAP: Record<string, string[]> = {
  system: ["system"],
  auth: ["auth"],
  deals: ["deals"],
  clients: ["clients", "onboarding"],
  employees: ["employees"],
  tasks: ["tasks"],
  payments: ["payments", "payment", "proposal"],
  emails: ["emails", "agreement"],
  errors: ["errors"],
};

export async function GET(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin");
  if (error) return error;

  try {
    const db = await getDB();
    const logRepo = db.getRepository(Log);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build date filter
    let dateFilter: FindOptionsWhere<Log>["createdAt"] | undefined;
    if (from && to) {
      dateFilter = Between(new Date(from), new Date(to + "T23:59:59.999Z"));
    } else if (from) {
      dateFilter = Between(new Date(from), new Date("2099-12-31"));
    } else if (to) {
      dateFilter = Between(new Date("2000-01-01"), new Date(to + "T23:59:59.999Z"));
    }

    // Resolve category filter to actual DB values
    let categoryFilter: FindOptionsWhere<Log>["category"] | undefined;
    if (category && category !== "all") {
      const mapped = CATEGORY_MAP[category];
      if (mapped && mapped.length > 1) {
        categoryFilter = In(mapped);
      } else if (mapped) {
        categoryFilter = mapped[0];
      } else {
        categoryFilter = category; // fallback: exact match
      }
    }

    // Search across message, event, and userName using OR conditions
    let where: FindOptionsWhere<Log>[] | FindOptionsWhere<Log>;

    if (search) {
      const base: Partial<FindOptionsWhere<Log>> = {};
      if (categoryFilter) base.category = categoryFilter;
      if (dateFilter) base.createdAt = dateFilter;

      where = [
        { ...base, message: ILike(`%${search}%`) },
        { ...base, event: ILike(`%${search}%`) },
        { ...base, userName: ILike(`%${search}%`) },
      ];
    } else {
      const w: FindOptionsWhere<Log> = {};
      if (categoryFilter) w.category = categoryFilter;
      if (dateFilter) w.createdAt = dateFilter;
      where = w;
    }

    const [logs, total] = await logRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({ logs, total, page, limit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
