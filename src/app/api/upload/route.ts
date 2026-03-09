import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { error } = await requireRole("admin", "subadmin", "sales", "backend");
  if (error) return error;

  try {
    const sb = getSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `task-files/${safeName}`;

    const { error: uploadError } = await sb.storage
      .from("launchpad")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = sb.storage
      .from("launchpad")
      .getPublicUrl(path);

    return NextResponse.json({
      fileUrl: urlData.publicUrl,
      fileName: file.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
