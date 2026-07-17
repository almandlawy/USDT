import { describe, expect, it } from "vitest";
import {
  assertMethodAllowedForCountry,
  fallbackMatrixForCountry,
  resolvePaymentMethodsForCountry,
  toPublicMethodDisplays,
} from "@/lib/payments/matrix";

describe("Iraq payment routing", () => {
  it("shows FIB, SuperQi, Zain Cash, bank transfer — never Stripe", () => {
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("IQ"), "IQ");
    expect(methods.map((m) => m.code)).toEqual(["fib", "superqi", "zain_cash", "bank_transfer"]);
    expect(methods.some((m) => m.code === "stripe_card")).toBe(false);
    expect(assertMethodAllowedForCountry("IQ", "stripe_card")).toBe(false);
  });

  it("public chooser exposes names only without settlement account hints", () => {
    const publicMethods = toPublicMethodDisplays(
      resolvePaymentMethodsForCountry(fallbackMatrixForCountry("IQ"), "IQ"),
    );
    expect(publicMethods.every((m) => m.name_en || m.name_ar)).toBe(true);
    expect(JSON.stringify(publicMethods)).not.toMatch(/IBAN|merchant|api[_-]?key|secret/i);
  });
});

describe("UAE payment routing", () => {
  it("includes Stripe gate, e& money, du Pay, bank transfer", () => {
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("AE"), "AE");
    expect(methods.some((m) => m.code === "eand_money")).toBe(true);
    expect(methods.some((m) => m.code === "dupay")).toBe(true);
    expect(methods.some((m) => m.code === "bank_transfer")).toBe(true);
    const stripe = methods.find((m) => m.code === "stripe_card");
    expect(stripe).toBeTruthy();
    expect(stripe?.available).toBe(false);
  });

  it("enables Stripe only when all three gates are true", () => {
    const prev = {
      STRIPE_ENABLED: process.env.STRIPE_ENABLED,
      STRIPE_CRYPTO_APPROVED: process.env.STRIPE_CRYPTO_APPROVED,
      REAL_PAYMENTS_ENABLED: process.env.REAL_PAYMENTS_ENABLED,
    };
    process.env.STRIPE_ENABLED = "true";
    process.env.STRIPE_CRYPTO_APPROVED = "true";
    process.env.REAL_PAYMENTS_ENABLED = "true";
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("AE"), "AE");
    expect(methods.find((m) => m.code === "stripe_card")?.available).toBe(true);
    process.env.STRIPE_ENABLED = prev.STRIPE_ENABLED;
    process.env.STRIPE_CRYPTO_APPROVED = prev.STRIPE_CRYPTO_APPROVED;
    process.env.REAL_PAYMENTS_ENABLED = prev.REAL_PAYMENTS_ENABLED;
  });
});

describe("rest of world", () => {
  it("offers Stripe (gated) and international bank transfer", () => {
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("OTHER"), "OTHER");
    expect(methods.map((m) => m.code)).toEqual(["stripe_card", "bank_transfer"]);
  });
});
