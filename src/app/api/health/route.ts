import { NextResponse } from "next/server";
import { getUsdToAedRate, getUsdToIqdRate } from "@/lib/market-quotes";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Safe health probe — no secrets, no PII.
 * LIVE_TRADING state is reported as a boolean lock indicator only.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "unconfigured" | "error" = "unconfigured";
  let market: "ok" | "degraded" | "error" = "degraded";

  if (isSupabaseConfigured()) {
    try {
      const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL!;
      const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
      const response = await fetch(`${url}/rest/v1/site_settings?key=eq.live_trading&select=key`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      database = response.ok ? "ok" : "error";
    } catch {
      database = "error";
    }
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/ping",
      { cache: "no-store", signal: AbortSignal.timeout(2500) },
    );
    market = response.ok ? "ok" : "degraded";
  } catch {
    market = "degraded";
  }

  const liveTrading =
    process.env.LIVE_TRADING === "true" || process.env.NEXT_PUBLIC_LIVE_TRADING === "true";

  return NextResponse.json(
    {
      status: database === "error" ? "degraded" : "ok",
      service: "gulf-gate-platform",
      liveTradingLocked: !liveTrading,
      checks: {
        database,
        marketProvider: market,
        storage: isSupabaseConfigured() ? "configured" : "unconfigured",
        email: process.env.SMTP_HOST || process.env.RESEND_API_KEY ? "configured" : "unconfigured",
      },
      fxFallback: {
        usdToIqd: getUsdToIqdRate(),
        usdToAed: getUsdToAedRate(),
      },
      version: {
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
      },
      durationMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    },
    {
      status: database === "error" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
