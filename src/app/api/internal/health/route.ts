import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getUsdToAedRate, getUsdToIqdRate } from "@/lib/market-quotes";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

function tokenOk(provided: string | null, expected: string | undefined) {
  if (!provided || !expected || expected.length < 24) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Internal health — requires INTERNAL_HEALTH_TOKEN bearer OR staff AAL2 session.
 */
export async function GET() {
  const headerStore = await headers();
  const auth = headerStore.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const tokenAllowed = tokenOk(bearer, process.env.INTERNAL_HEALTH_TOKEN?.trim());

  let staffAllowed = false;
  if (!tokenAllowed && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [{ data: user }, { data: assurance }, { data: roles }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.from("staff_roles").select("role").limit(1),
      ]);
      staffAllowed = Boolean(user.user && assurance?.currentLevel === "aal2" && (roles?.length || 0) > 0);
    } catch {
      staffAllowed = false;
    }
  }

  if (!tokenAllowed && !staffAllowed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  }

  let database: "ok" | "error" | "unconfigured" = "unconfigured";
  let dbLiveTrading: boolean | null = null;
  if (isSupabaseConfigured()) {
    try {
      const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL!;
      const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
      const response = await fetch(`${url}/rest/v1/site_settings?key=eq.live_trading&select=value`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      database = response.ok ? "ok" : "error";
      if (response.ok) {
        const rows = (await response.json()) as Array<{ value?: unknown }>;
        const raw = rows[0]?.value;
        dbLiveTrading = raw === true || raw === "true";
      }
    } catch {
      database = "error";
    }
  }

  let market: "ok" | "degraded" = "degraded";
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/ping", {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    market = response.ok ? "ok" : "degraded";
  } catch {
    market = "degraded";
  }

  return NextResponse.json(
    {
      status: database === "error" || dbLiveTrading === true ? "degraded" : "ok",
      service: "gulf-gate-platform",
      liveTradingLocked: process.env.LIVE_TRADING !== "true" && process.env.NEXT_PUBLIC_LIVE_TRADING !== "true" && dbLiveTrading !== true,
      checks: {
        database,
        dbLiveTrading,
        marketProvider: market,
        storage: isSupabaseConfigured() ? "configured" : "unconfigured",
        emailConfigured: Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY),
        captchaConfigured: Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
        securityHashConfigured: Boolean(process.env.SECURITY_HASH_SECRET && process.env.SECURITY_HASH_SECRET.length >= 32),
      },
      fxFallback: { usdToIqd: getUsdToIqdRate(), usdToAed: getUsdToAedRate() },
      version: {
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
      },
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
