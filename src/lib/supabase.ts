import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _checked = false;

export function getSupabase(): SupabaseClient | null {
  if (!_checked) {
    _checked = true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn("Supabase env vars missing — notifications disabled.");
      return null;
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}
