import "server-only";
import { deriveIqd, normalizeQuote } from "@/lib/market-quotes";
import { getMarketFxSettings } from "@/lib/market-fx";

export type MarketAsset = {
  symbol: string;
  name: string;
  usd: number | null;
  aed: number | null;
  iqd: number | null;
  change24h: number | null;
  updatedAt: string | null;
  available: boolean;
};

export type MarketStatus = "live" | "live_with_derived_fx" | "fallback";

export type MarketSnapshot = {
  assets: MarketAsset[];
  status: MarketStatus;
  /** @deprecated prefer `status` */
  source: "coingecko" | "coingecko+fx" | "fallback";
  stale: boolean;
  fetchedAt: string;
  lastSuccessAt: string | null;
  fxNote?: string;
  fxSource?: "database" | "environment";
};

const coins = [
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
] as const;

let lastSuccessAt: string | null = null;

function marketTimeoutMs() {
  const raw = Number(process.env.MARKET_PROVIDER_TIMEOUT_MS || 4000);
  return Number.isFinite(raw) && raw >= 1000 && raw <= 15_000 ? raw : 4000;
}

function unavailableAssets(now: string, usdIqd: number, usdAed: number): MarketAsset[] {
  // Only USDT may show an indicative 1 USD reference during provider outage.
  return [
    { symbol: "USDT", name: "Tether", usd: 1, aed: usdAed, iqd: usdIqd, change24h: null, updatedAt: null, available: true },
    { symbol: "BTC", name: "Bitcoin", usd: null, aed: null, iqd: null, change24h: null, updatedAt: null, available: false },
    { symbol: "ETH", name: "Ethereum", usd: null, aed: null, iqd: null, change24h: null, updatedAt: null, available: false },
    { symbol: "USDC", name: "USD Coin", usd: null, aed: null, iqd: null, change24h: null, updatedAt: null, available: false },
  ].map((asset) => ({ ...asset, updatedAt: asset.symbol === "USDT" ? now : null }));
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const fx = await getMarketFxSettings();
  const key = process.env.COINGECKO_DEMO_API_KEY?.trim();
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum,usd-coin&vs_currencies=usd,aed&include_24hr_change=true&include_last_updated_at=true&precision=full";
  try {
    const response = await fetch(url, {
      headers: key ? { "x-cg-demo-api-key": key } : {},
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(marketTimeoutMs()),
    });
    if (!response.ok) throw new Error(`MARKET_PROVIDER_${response.status}`);
    const body = (await response.json()) as Record<string, Record<string, number | null>>;
    let derivedIqd = false;
    const assets = coins.map((coin) => {
      const row = body[coin.id];
      const usd = normalizeQuote(row?.usd);
      if (!usd) throw new Error("INVALID_MARKET_RESPONSE");
      const aed = normalizeQuote(row?.aed) ?? usd * fx.usdToAed;
      const { iqd, derived } = deriveIqd(usd, normalizeQuote(row?.iqd), fx.usdToIqd);
      if (derived) derivedIqd = true;
      return {
        symbol: coin.symbol,
        name: coin.name,
        usd,
        aed,
        iqd,
        change24h: typeof row?.usd_24h_change === "number" ? row.usd_24h_change : null,
        updatedAt: new Date(Number(row?.last_updated_at || Date.now() / 1000) * 1000).toISOString(),
        available: true,
      };
    });
    const fetchedAt = new Date().toISOString();
    lastSuccessAt = fetchedAt;
    const status: MarketStatus = derivedIqd ? "live_with_derived_fx" : "live";
    return {
      assets,
      status,
      source: derivedIqd ? "coingecko+fx" : "coingecko",
      // Derived FX is not “stale market data” — only true fallback is stale.
      stale: false,
      fetchedAt,
      lastSuccessAt,
      fxNote: derivedIqd ? `USD×${fx.usdToIqd} IQD` : undefined,
      fxSource: fx.source,
    };
  } catch {
    const now = new Date().toISOString();
    return {
      assets: unavailableAssets(now, fx.usdToIqd, fx.usdToAed),
      status: "fallback",
      source: "fallback",
      stale: true,
      fetchedAt: now,
      lastSuccessAt,
      fxNote: `USD×${fx.usdToIqd} IQD`,
      fxSource: fx.source,
    };
  }
}
