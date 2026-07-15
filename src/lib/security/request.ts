import "server-only";
import { headers } from "next/headers";
import { getSiteOrigin, PRODUCTION_ORIGIN } from "@/lib/site";

function hostFrom(value: string) {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

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

  const allowedByConfig = allowed.has(host);
  const allowedPreview = host.endsWith(".vercel.app");
  if (!allowedByConfig && !allowedPreview) throw new Error("CSRF_ORIGIN_REJECTED");
}

export async function requestFingerprint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";
  return `${forwarded}:${userAgent.slice(0, 160)}`;
}
