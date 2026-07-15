import "server-only";
import { headers } from "next/headers";
import { getSiteOrigin } from "@/lib/site";

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (!origin || !host) throw new Error("CSRF_ORIGIN_REQUIRED");
  const originHost = new URL(origin).host;
  const allowedHost = new URL(getSiteOrigin()).host;
  // Require same-origin posting, and reject posts that do not target the
  // configured production/app host (falls back to gulf-gate-platform.vercel.app).
  if (originHost !== host || originHost !== allowedHost) throw new Error("CSRF_ORIGIN_REJECTED");
}

export async function requestFingerprint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";
  return `${forwarded}:${userAgent.slice(0, 160)}`;
}
