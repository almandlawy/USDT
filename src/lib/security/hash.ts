import "server-only";
import { hmacSha256 } from "@/lib/security/hmac";

function resolveSecret(): string {
  const secret = process.env.SECURITY_HASH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    return `unconfigured:${process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || "gulf-gate"}`;
  }
  return "local-dev-only-security-hash-secret!!";
}

/** HMAC-SHA256 for security telemetry. Never log or return the raw input. */
export function hashSecurityValue(value: string): string {
  return hmacSha256(resolveSecret(), value);
}

export function isSecurityHashConfigured() {
  const secret = process.env.SECURITY_HASH_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export { hashesEqual } from "@/lib/security/hmac";
