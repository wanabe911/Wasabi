import { createClient } from "@supabase/supabase-js";

export function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL atau SUPABASE_KEY belum diset!");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  supabase.from("chat_history").select("id").limit(1)
    .then(() => console.log("Supabase terhubung!"))
    .catch((err) => console.error("Supabase gagal konek:", err.message));

  return supabase;
}
