import "server-only";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (!origin || !host) throw new Error("CSRF_ORIGIN_REQUIRED");
  const allowed = new URL(publicEnv.NEXT_PUBLIC_APP_URL);
  if (new URL(origin).host !== host || new URL(origin).host !== allowed.host) throw new Error("CSRF_ORIGIN_REJECTED");
}

export async function requestFingerprint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";
  return `${forwarded}:${userAgent.slice(0, 160)}`;
}
