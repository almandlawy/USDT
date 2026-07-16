import "server-only";
import { hmacSha256 } from "@/lib/security/hmac";
import { isVercelProduction } from "@/lib/env";

const DEV_ONLY_SECRET = "local-dev-only-security-hash-secret!!";

/**
 * Resolve HMAC secret. Vercel Production must set SECURITY_HASH_SECRET (>=32).
 * Never falls back to deployment ID, hostname, or a constant in production.
 */
export function resolveSecret(): string {
  const secret = process.env.SECURITY_HASH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (isVercelProduction()) {
    throw new Error("SECURITY_HASH_SECRET must be set to a value of at least 32 characters in production");
  }
  return DEV_ONLY_SECRET;
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
