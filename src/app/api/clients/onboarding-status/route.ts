import { NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const { error } = await requireRole("admin", "subadmin", "sales", "agency", "agent");
  if (error) return error;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({});

  try {
    const { data } = await sb
      .from("clients")
      .select("client_email, payment_status, onboarding_form_completed, agreement_signed");

    if (!data) return NextResponse.json({});

    // Map: email → { stripe, onboarding, agreement }
    const map: Record<string, { stripe: boolean; onboarding: boolean; agreement: boolean }> = {};
    for (const row of data) {
      if (row.client_email) {
        map[row.client_email] = {
          stripe: row.payment_status === "paid",
          onboarding: row.onboarding_form_completed === true,
          agreement: row.agreement_signed === true,
        };
      }
    }

    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}
