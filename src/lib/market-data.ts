import "server-only";
import { deriveIqd, normalizeQuote } from "@/lib/market-quotes";
import { getMarketFxSettings } from "@/lib/market-fx";

export type MarketAsset = {
  symbol: string;
  name: string;
  usd: number;
  aed: number;
  iqd: number;
  change24h: number | null;
  updatedAt: string;
};

export type MarketSnapshot = {
  assets: MarketAsset[];
  source: "coingecko" | "coingecko+fx" | "fallback";
  stale: boolean;
  fetchedAt: string;
  fxNote?: string;
  providerError?: string | null;
  fxSource?: "database" | "environment";
};

const coins = [
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
] as const;

function marketTimeoutMs() {
  const raw = Number(process.env.MARKET_PROVIDER_TIMEOUT_MS || 4000);
  return Number.isFinite(raw) && raw >= 1000 && raw <= 15_000 ? raw : 4000;
}

function fallbackAssets(now: string, usdIqd: number, usdAed: number): MarketAsset[] {
  return [
    { symbol: "USDT", name: "Tether", usd: 1, aed: usdAed, iqd: usdIqd, change24h: null, updatedAt: now },
    { symbol: "BTC", name: "Bitcoin", usd: 65000, aed: 65000 * usdAed, iqd: 65000 * usdIqd, change24h: null, updatedAt: now },
    { symbol: "ETH", name: "Ethereum", usd: 3500, aed: 3500 * usdAed, iqd: 3500 * usdIqd, change24h: null, updatedAt: now },
    { symbol: "USDC", name: "USD Coin", usd: 1, aed: usdAed, iqd: usdIqd, change24h: null, updatedAt: now },
  ];
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
      };
    });
    return {
      assets,
      source: derivedIqd ? "coingecko+fx" : "coingecko",
      stale: derivedIqd,
      fetchedAt: new Date().toISOString(),
      fxNote: derivedIqd ? `USD×${fx.usdToIqd} IQD` : undefined,
      providerError: null,
      fxSource: fx.source,
    };
  } catch (error) {
    const now = new Date().toISOString();
    return {
      assets: fallbackAssets(now, fx.usdToIqd, fx.usdToAed),
      source: "fallback",
      stale: true,
      fetchedAt: now,
      fxNote: `USD×${fx.usdToIqd} IQD`,
      providerError: error instanceof Error ? error.message.slice(0, 80) : "provider_unavailable",
      fxSource: fx.source,
    };
  }
}
