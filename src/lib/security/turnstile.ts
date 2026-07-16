import "server-only";

export type TurnstileResult =
  | { ok: true }
  | { ok: false; code: "captcha_required" | "captcha_failed" };

/**
 * Verify Cloudflare Turnstile when configured.
 * - TURNSTILE_BYPASS_FOR_TESTS=true works only outside Production.
 * - If keys are not configured yet, verification is skipped (auth still rate-limited).
 * - When keys ARE configured, token is mandatory.
 */
export async function verifyTurnstile(token: FormDataEntryValue | null, remoteIp?: string | null): Promise<TurnstileResult> {
  if (process.env.TURNSTILE_BYPASS_FOR_TESTS === "true" && process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!secret || !siteKey) return { ok: true };

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
