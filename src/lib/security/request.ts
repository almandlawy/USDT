import "server-only";
import { headers } from "next/headers";
import { hashSecurityValue } from "@/lib/security/hash";
import { getSiteOrigin, PRODUCTION_ORIGIN } from "@/lib/site";

function hostFrom(value: string) {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

/**
 * Same-origin CSRF check.
 * Allows: configured site origin, production origin, current VERCEL_URL,
 * VERCEL_PROJECT_PRODUCTION_URL, and optional comma-separated CSRF_ALLOWED_HOSTS.
 * Does NOT accept arbitrary *.vercel.app hosts.
 */
export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host")?.toLowerCase();
  if (!origin || !host) throw new Error("CSRF_ORIGIN_REQUIRED");
  const originHost = new URL(origin).host.toLowerCase();
  if (originHost !== host) throw new Error("CSRF_ORIGIN_REJECTED");

  const allowed = new Set<string>([
    hostFrom(getSiteOrigin()),
    hostFrom(PRODUCTION_ORIGIN),
  ]);
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) allowed.add(hostFrom(vercelUrl));
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) allowed.add(hostFrom(vercelProduction));

  const extra = process.env.CSRF_ALLOWED_HOSTS?.split(",").map((item) => item.trim()).filter(Boolean) || [];
  for (const item of extra) allowed.add(hostFrom(item));

  if (!allowed.has(host)) throw new Error("CSRF_ORIGIN_REJECTED");
}

export type RequestHashes = {
  ipHash: string;
  userAgentHash: string;
  /** Opaque rate-limit key — never store as PII. */
  rateLimitKey: string;
};

/** Hash IP and User-Agent separately with HMAC. Never returns raw values. */
export async function requestSecurityHashes(): Promise<RequestHashes> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = (requestHeaders.get("user-agent") || "unknown").slice(0, 256);
  const ipHash = hashSecurityValue(`ip:${forwarded}`);
  const userAgentHash = hashSecurityValue(`ua:${userAgent}`);
  const rateLimitKey = hashSecurityValue(`rl:${forwarded}|${userAgent.slice(0, 160)}`);
  return { ipHash, userAgentHash, rateLimitKey };
}

/** @deprecated Use requestSecurityHashes — kept as rate-limit key helper. */
export async function requestFingerprint() {
  const hashes = await requestSecurityHashes();
  return hashes.rateLimitKey;
}

export async function clientIpHint(): Promise<string | null> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
