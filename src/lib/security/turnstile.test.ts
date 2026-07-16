import { afterEach, describe, expect, it, vi } from "vitest";

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("allows test bypass outside Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TURNSTILE_BYPASS_FOR_TESTS", "true");
    const { verifyTurnstile } = await import("./turnstile");
    await expect(verifyTurnstile(null)).resolves.toEqual({ ok: true });
  });

  it("rejects missing keys in Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TURNSTILE_BYPASS_FOR_TESTS", "false");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const { verifyTurnstile } = await import("./turnstile");
    await expect(verifyTurnstile("token")).resolves.toEqual({ ok: false, code: "captcha_misconfigured" });
  });

  it("ignores bypass flag in Vercel production and still requires keys", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TURNSTILE_BYPASS_FOR_TESTS", "true");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const { verifyTurnstile } = await import("./turnstile");
    await expect(verifyTurnstile("token")).resolves.toEqual({ ok: false, code: "captcha_misconfigured" });
  });

  it("requires token when keys are configured", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TURNSTILE_BYPASS_FOR_TESTS", "false");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    const { verifyTurnstile } = await import("./turnstile");
    await expect(verifyTurnstile("")).resolves.toEqual({ ok: false, code: "captcha_required" });
  });

  it("accepts a valid Cloudflare response", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TURNSTILE_BYPASS_FOR_TESTS", "false");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
    const { verifyTurnstile } = await import("./turnstile");
    await expect(verifyTurnstile("good-token")).resolves.toEqual({ ok: true });
  });

  it("fails on Cloudflare 500", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TURNSTILE_BYPASS_FOR_TESTS", "false");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );
    const { verifyTurnstile } = await import("./turnstile");
    await expect(verifyTurnstile("token")).resolves.toEqual({ ok: false, code: "captcha_failed" });
  });
});
