import { describe, expect, it } from "vitest";
import { hmacSha256 } from "./hmac";

describe("security hashing", () => {
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

  it("is deterministic for the same input", () => {
    const secret = "unit-test-security-hash-secret-32chars";
    expect(hmacSha256(secret, "ip:9.9.9.9")).toBe(hmacSha256(secret, "ip:9.9.9.9"));
  });
});
