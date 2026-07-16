import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("market snapshot fallback behaviour", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks BTC/ETH unavailable when the provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("market_fx") || url.includes("rest/v1")) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response("rate limited", { status: 429 });
      }),
    );
    const { getMarketSnapshot } = await import("./market-data");
    const snapshot = await getMarketSnapshot();
    expect(snapshot.status).toBe("fallback");
    const btc = snapshot.assets.find((asset) => asset.symbol === "BTC");
    const eth = snapshot.assets.find((asset) => asset.symbol === "ETH");
    const usdt = snapshot.assets.find((asset) => asset.symbol === "USDT");
    expect(btc?.available).toBe(false);
    expect(btc?.usd).toBeNull();
    expect(eth?.available).toBe(false);
    expect(usdt?.available).toBe(true);
    expect(usdt?.iqd).toBeGreaterThan(0);
  });
});
