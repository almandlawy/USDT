import { describe, expect, it } from "vitest";
import {
  fallbackMatrixForCountry,
  resolvePaymentMethodsForCountry,
} from "@/lib/payments/matrix";

describe("country payment matrix", () => {
  it("puts Zain Cash first for Iraq", () => {
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("IQ"), "IQ");
    expect(methods[0]?.code).toBe("zain_cash");
    expect(methods.some((m) => m.code === "bank_transfer")).toBe(true);
  });

  it("includes UAE manual wallets without claiming automatic confirmation", () => {
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("AE"), "AE");
    expect(methods.some((m) => m.code === "eand_money")).toBe(true);
    expect(methods.some((m) => m.code === "dupay")).toBe(true);
    const eand = methods.find((m) => m.code === "eand_money");
    expect(eand?.requires_proof).toBe(true);
  });

  it("disables Stripe for customers until crypto approval gates pass", () => {
    const prev = {
      STRIPE_ENABLED: process.env.STRIPE_ENABLED,
      STRIPE_CRYPTO_APPROVED: process.env.STRIPE_CRYPTO_APPROVED,
      REAL_PAYMENTS_ENABLED: process.env.REAL_PAYMENTS_ENABLED,
    };
    process.env.STRIPE_ENABLED = "false";
    process.env.STRIPE_CRYPTO_APPROVED = "false";
    process.env.REAL_PAYMENTS_ENABLED = "false";
    const methods = resolvePaymentMethodsForCountry(fallbackMatrixForCountry("US"), "US");
    const stripe = methods.find((m) => m.code === "stripe_card");
    expect(stripe?.available).toBe(false);
    expect(stripe?.displayMode).toBe("disabled");
    expect(stripe?.disabledReason?.ar).toContain("الدفع بالبطاقة غير متاح");
    process.env.STRIPE_ENABLED = prev.STRIPE_ENABLED;
    process.env.STRIPE_CRYPTO_APPROVED = prev.STRIPE_CRYPTO_APPROVED;
    process.env.REAL_PAYMENTS_ENABLED = prev.REAL_PAYMENTS_ENABLED;
  });
});
