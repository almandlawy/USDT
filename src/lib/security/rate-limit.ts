import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function enforceRateLimit(key: string, maxHits = 5, windowSeconds = 60) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    input_key: key,
    max_hits: maxHits,
    window_seconds: windowSeconds,
  });
  if (error) throw new Error("RATE_LIMIT_UNAVAILABLE");
  if (!data) throw new Error("RATE_LIMITED");
}
