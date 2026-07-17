import { describe, expect, it } from "vitest";
import {
  generatePaymentReference,
  generateQuotePublicToken,
  hashQuoteToken,
  quoteLinkPath,
  signQuoteToken,
  verifyQuoteTokenSignature,
} from "@/lib/quote-links/token";
import { validateWalletAddress, walletsMatch } from "@/lib/wallet/validate";
import { canTransition } from "@/lib/order-state";
import { LockedFulfillmentProvider } from "@/lib/fulfillment/types";

describe("quote link tokens", () => {
  it("creates 128-bit+ tokens hashed for storage", () => {
    const bundle = generateQuotePublicToken();
    expect(bundle.token.length).toBeGreaterThanOrEqual(22);
    expect(hashQuoteToken(bundle.token)).toBe(bundle.hash);
    expect(hashQuoteToken("other")).not.toBe(bundle.hash);
    expect(quoteLinkPath("ar", bundle.token)).toBe(`/ar/q/${bundle.token}`);
    expect(quoteLinkPath("ar", bundle.token)).not.toMatch(/amount|usdt|email/i);
  });

  it("verifies HMAC signatures", () => {
    const { token } = generateQuotePublicToken();
    const sig = signQuoteToken(token, "test-secret-at-least-32-characters!!");
    expect(verifyQuoteTokenSignature(token, sig, "test-secret-at-least-32-characters!!")).toBe(true);
    expect(verifyQuoteTokenSignature(token, sig, "wrong-secret-at-least-32-characters!")).toBe(false);
  });

  it("builds GG-YEAR payment references", () => {
    expect(generatePaymentReference(2026)).toMatch(/^GG-2026-[0-9A-F]{6}$/);
  });
});

describe("wallet validation", () => {
  it("validates TRC20 and rejects secrets", () => {
    expect(validateWalletAddress("TRC20", "TXYZabcdefghijklmnopqrstuvwxyz123456").ok).toBe(false);
    const validShaped = validateWalletAddress("TRC20", `T${"A".repeat(33)}`);
    expect(validShaped.ok).toBe(true);
    expect(validateWalletAddress("TRC20", "seed phrase words here forever now").ok).toBe(false);
  });

  it("requires matching confirmations", () => {
    const a = "0x1111111111111111111111111111111111111111";
    expect(walletsMatch(a, a.toUpperCase(), "ERC20")).toBe(true);
    expect(walletsMatch(a, "0x2222222222222222222222222222222222222222", "ERC20")).toBe(false);
  });
});

describe("payment success never auto-completes", () => {
  it("allows payment_received_pending_review without live trading", () => {
    expect(canTransition("awaiting_payment", "payment_received_pending_review", false)).toBe(true);
    expect(canTransition("payment_pending", "payment_received_pending_review", false)).toBe(true);
  });

  it("blocks fulfillment and completed while live trading is off", () => {
    expect(canTransition("approved", "processing", false)).toBe(false);
    expect(canTransition("approved_for_fulfillment", "fulfillment_in_progress", false)).toBe(false);
    expect(canTransition("fulfillment_in_progress", "fulfilled", false)).toBe(false);
    expect(canTransition("processing", "completed", false)).toBe(false);
  });
});

describe("locked fulfillment provider", () => {
  it("refuses automatic transfers", async () => {
    const provider = new LockedFulfillmentProvider();
    const result = await provider.createTransfer();
    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
  });
});
