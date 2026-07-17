import { describe, expect, it, afterEach } from "vitest";
import { getServerEnv } from "@/lib/env";

const KEYS = ["AUTO_FULFILLMENT_ENABLED", "LIVE_TRADING", "NEXT_PUBLIC_LIVE_TRADING", "VERCEL_ENV"] as const;
const snapshot: Record<string, string | undefined> = {};

afterEach(() => {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

describe("payment env gates", () => {
  it("rejects AUTO_FULFILLMENT_ENABLED=true", () => {
    for (const key of KEYS) snapshot[key] = process.env[key];
    process.env.LIVE_TRADING = "false";
    process.env.NEXT_PUBLIC_LIVE_TRADING = "false";
    delete process.env.VERCEL_ENV;
    process.env.AUTO_FULFILLMENT_ENABLED = "true";
    expect(() => getServerEnv()).toThrow(/AUTO_FULFILLMENT_ENABLED/);
  });

  it("allows default locked payment flags", () => {
    for (const key of KEYS) snapshot[key] = process.env[key];
    process.env.LIVE_TRADING = "false";
    process.env.NEXT_PUBLIC_LIVE_TRADING = "false";
    process.env.AUTO_FULFILLMENT_ENABLED = "false";
    delete process.env.VERCEL_ENV;
    const env = getServerEnv();
    expect(env.AUTO_FULFILLMENT_ENABLED).toBe(false);
    expect(env.REAL_PAYMENTS_ENABLED).toBe(false);
    expect(env.STRIPE_ENABLED).toBe(false);
    expect(env.STRIPE_CRYPTO_APPROVED).toBe(false);
    expect(env.ZAINCASH_ENABLED).toBe(false);
  });
});
