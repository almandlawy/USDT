import { afterEach, describe, expect, it, vi } from "vitest";
import { hmacSha256 } from "./hmac";

describe("security hashing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("produces distinct HMAC digests for IP and UA with the same secret", () => {
    const secret = "unit-test-security-hash-secret-32chars";
    const ip = hmacSha256(secret, "ip:1.2.3.4");
    const ua = hmacSha256(secret, "ua:Mozilla/5.0");
    expect(ip).toHaveLength(64);
    expect(ua).toHaveLength(64);
    expect(ip).not.toBe(ua);
    expect(ip).not.toContain("1.2.3.4");
    expect(ua).not.toContain("Mozilla");
  });

  it("is deterministic for the same input and changes with secret", () => {
    const a = hmacSha256("unit-test-security-hash-secret-32chars", "ip:9.9.9.9");
    const b = hmacSha256("unit-test-security-hash-secret-32chars", "ip:9.9.9.9");
    const c = hmacSha256("different-security-hash-secret-32char!", "ip:9.9.9.9");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("uses local secret outside Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("SECURITY_HASH_SECRET", "");
    const { resolveSecret, hashSecurityValue } = await import("./hash");
    expect(resolveSecret()).toContain("local-dev-only");
    const digest = hashSecurityValue("ip:8.8.8.8");
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain("8.8.8.8");
  });

  it("fails closed in Vercel production without SECURITY_HASH_SECRET", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SECURITY_HASH_SECRET", "");
    const { resolveSecret } = await import("./hash");
    expect(() => resolveSecret()).toThrow(/SECURITY_HASH_SECRET/);
  });
});
