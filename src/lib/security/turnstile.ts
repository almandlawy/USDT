import "server-only";
import { isVercelProduction } from "@/lib/env";

export type TurnstileResult =
  | { ok: true }
  | { ok: false; code: "captcha_required" | "captcha_failed" | "captcha_misconfigured" };

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

/**
 * Verify Cloudflare Turnstile.
 * - Vercel Production: keys required; missing keys => captcha_misconfigured (fail closed).
 * - Test bypass only when not Vercel Production AND TURNSTILE_BYPASS_FOR_TESTS=true.
 */
export async function verifyTurnstile(
  token: FormDataEntryValue | null,
  remoteIp?: string | null,
  options?: { required?: boolean },
): Promise<TurnstileResult> {
  const required = options?.required !== false;

  if (process.env.TURNSTILE_BYPASS_FOR_TESTS === "true") {
    if (isVercelProduction()) {
      console.error("[turnstile] TURNSTILE_BYPASS_FOR_TESTS ignored in production");
    } else {
      return { ok: true };
    }
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!secret || !siteKey) {
    if (required) {
      if (isVercelProduction()) {
        console.error("[turnstile] misconfigured: missing site/secret keys in production");
      }
      return { ok: false, code: "captcha_misconfigured" };
    }
    return { ok: true };
  }

  const value = String(token || "").trim();
  if (!value) return { ok: false, code: "captcha_required" };

  try {
    const body = new URLSearchParams({ secret, response: value });
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, code: "captcha_failed" };
    const data = (await response.json()) as { success?: boolean };
    return data.success ? { ok: true } : { ok: false, code: "captcha_failed" };
  } catch {
    return { ok: false, code: "captcha_failed" };
  }
}
