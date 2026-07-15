import { describe, expect, it } from "vitest";
import { deriveIqd, normalizeQuote } from "./market-quotes";

describe("market data quotes", () => {
  it("rejects zero and non-positive provider values", () => {
    expect(normalizeQuote(0)).toBeNull();
    expect(normalizeQuote(-1)).toBeNull();
    expect(normalizeQuote(null)).toBeNull();
    expect(normalizeQuote(1310)).toBe(1310);
  });

  it("derives IQD from USD when the provider omits IQD", () => {
    expect(deriveIqd(1, null, 1310)).toEqual({ iqd: 1310, derived: true });
    expect(deriveIqd(2, 0, 1310)).toEqual({ iqd: 2620, derived: true });
    expect(deriveIqd(1, 1400, 1310)).toEqual({ iqd: 1400, derived: false });
  });
});
