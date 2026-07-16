import { NextResponse } from "next/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Public health probe — minimal fields only. No secrets, commits, or provider details.
 */
export async function GET() {
  const checkedAt = new Date().toISOString();
  const envLocked =
    process.env.LIVE_TRADING !== "true" && process.env.NEXT_PUBLIC_LIVE_TRADING !== "true";

  let dbLiveTrading: boolean | null = null;
  let databaseOk = false;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { status: "degraded", service: "gulf-gate-platform", liveTradingLocked: true, checkedAt },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  try {
    const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL!;
    const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const response = await fetch(`${url}/rest/v1/site_settings?key=eq.live_trading&select=value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    databaseOk = response.ok;
    if (response.ok) {
      const rows = (await response.json()) as Array<{ value?: unknown }>;
      const raw = rows[0]?.value;
      dbLiveTrading = raw === true || raw === "true" || raw === 1;
    }
  } catch {
    databaseOk = false;
  }

  const dbLocked = dbLiveTrading !== true;
  const liveTradingLocked = envLocked && dbLocked;
  const conflict = !envLocked || dbLiveTrading === true;
  const status = !databaseOk || conflict ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      service: "gulf-gate-platform",
      liveTradingLocked: conflict ? true : liveTradingLocked,
      checkedAt,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
