import { describe, expect, it } from "vitest";
import { orderRequestSchema, passwordSchema, proofMetadataSchema } from "./forms";

describe("server form validation", () => {
  it("requires a strong password", () => {
    expect(passwordSchema.safeParse("weak-password").success).toBe(false);
    expect(passwordSchema.safeParse("Correct-Horse-2026!").success).toBe(true);
  });

  it("accepts only supported currencies and networks", () => {
    const base = { orderType: "buy", fiatCurrency: "IQD", network: "TRC20", amount: "1000", walletAddress: "T123456789ABCDEFGHJKLMNPQRSTUVWXYZ", transactionPurpose: "Business payment request", paymentMethodId: "00000000-0000-4000-8000-000000000020" };
    expect(orderRequestSchema.safeParse(base).success).toBe(true);
    expect(orderRequestSchema.safeParse({ ...base, network: "BEP20" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, fiatCurrency: "EUR" }).success).toBe(false);
  });

  it("rejects invalid payment metadata", () => {
    expect(proofMetadataSchema.safeParse({ transferReference: "x", senderName: "A", amount: -1, paymentAt: "bad" }).success).toBe(false);
  });
});
