import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getMarketSnapshot } from "@/lib/market-data";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { isSecurityHashConfigured } from "@/lib/security/hash";
import { isTurnstileConfigured } from "@/lib/security/turnstile";
import { trustContactReadiness } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

const EXPECTED_MIGRATION = "202607150012";

function tokenOk(provided: string | null, expected: string | undefined) {
  if (!provided || !expected || expected.length < 32) return false;
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
 * Used by CI to verify deployed commit SHA matches GITHUB_SHA.
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
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
    );
  }

  let database: "ok" | "error" | "unconfigured" = "unconfigured";
  let dbLiveTrading: boolean | null = null;
  let migrationMarker: string | null = null;
  let siteSettingsReadable = false;

  if (isSupabaseConfigured()) {
    try {
      const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL!;
      const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
      const response = await fetch(
        `${url}/rest/v1/site_settings?or=(key.eq.live_trading,key.eq.schema_migration_marker)&select=key,value`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        },
      );
      if (!response.ok) {
        database = "error";
      } else {
        siteSettingsReadable = true;
        database = "ok";
        const rows = (await response.json()) as Array<{ key?: string; value?: unknown }>;
        for (const row of rows) {
          if (row.key === "live_trading") {
            dbLiveTrading = row.value === true || row.value === "true" || row.value === 1;
          }
          if (row.key === "schema_migration_marker") {
            migrationMarker = typeof row.value === "string" ? row.value.replace(/"/g, "") : String(row.value ?? "");
          }
        }
      }
    } catch {
      database = "error";
    }
  }

  let market: "ok" | "degraded" = "degraded";
  let marketStatus: string | null = null;
  try {
    const snapshot = await getMarketSnapshot();
    marketStatus = snapshot.status;
    market = snapshot.status === "fallback" ? "degraded" : "ok";
  } catch {
    market = "degraded";
  }

  const emailConfigured =
    process.env.AUTH_EMAIL_PROVIDER_CONFIGURED === "true"
      ? "configured"
      : process.env.AUTH_EMAIL_PROVIDER_CONFIGURED === "false"
        ? "not_configured"
        : "unknown";

  const envLocked =
    process.env.LIVE_TRADING !== "true" && process.env.NEXT_PUBLIC_LIVE_TRADING !== "true";
  const liveTradingLocked = envLocked && dbLiveTrading !== true;
  const migrationOk = !migrationMarker || migrationMarker >= "202607150010";
  const readiness = trustContactReadiness();
  const intake = {
    kyc: process.env.KYC_INTAKE_ENABLED === "true",
    proof: process.env.PROOF_INTAKE_ENABLED === "true",
    kycPublic: process.env.NEXT_PUBLIC_KYC_INTAKE_ENABLED === "true",
    proofPublic: process.env.NEXT_PUBLIC_PROOF_INTAKE_ENABLED === "true",
  };

  const degraded =
    database === "unconfigured" ||
    database === "error" ||
    !liveTradingLocked ||
    !migrationOk ||
    market === "degraded" ||
    !isTurnstileConfigured() ||
    !isSecurityHashConfigured();

  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      service: "gulf-gate-platform",
      liveTradingLocked,
      checks: {
        database,
        siteSettingsReadable,
        dbLiveTrading,
        marketProvider: market,
        marketStatus,
        storage: isSupabaseConfigured() ? "unknown_use_supabase_dashboard" : "unconfigured",
        emailConfigured,
        captchaConfigured: isTurnstileConfigured(),
        securityHashConfigured: isSecurityHashConfigured(),
        migrationMarker,
        expectedMigration: EXPECTED_MIGRATION,
        trustContact: readiness,
        intakeFlags: intake,
      },
      version: {
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
        buildTime: process.env.BUILD_TIME || process.env.VERCEL_GIT_COMMIT_SHA || null,
        migrationsVersion: migrationMarker || "unknown",
      },
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
