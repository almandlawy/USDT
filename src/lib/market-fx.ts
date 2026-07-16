import "server-only";
import { getUsdToAedRate, getUsdToIqdRate, normalizeQuote } from "@/lib/market-quotes";

export type MarketFxSettings = {
  usdToIqd: number;
  usdToAed: number;
  updatedAt: string | null;
  source: "database" | "environment";
};

/**
 * Load indicative FX from public view `market_fx_public` (rates only).
 * Never selects notes/updated_by. Falls back to env defaults.
 */
export async function getMarketFxSettings(): Promise<MarketFxSettings> {
  const envFallback: MarketFxSettings = {
    usdToIqd: getUsdToIqdRate(),
    usdToAed: getUsdToAedRate(),
    updatedAt: null,
    source: "environment",
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return envFallback;

  try {
    // Prefer restricted public view; fall back to column-limited table select.
    const endpoints = [
      `${url}/rest/v1/market_fx_public?select=usd_to_iqd,usd_to_aed,updated_at&limit=1`,
      `${url}/rest/v1/market_fx_settings?id=eq.1&select=usd_to_iqd,usd_to_aed,updated_at`,
    ];
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
        next: { revalidate: 60, tags: ["market-fx"] },
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) continue;
      const rows = (await response.json()) as Array<{
        usd_to_iqd?: number;
        usd_to_aed?: number;
        updated_at?: string | null;
      }>;
      const row = rows[0];
      const usdToIqd = normalizeQuote(Number(row?.usd_to_iqd));
      const usdToAed = normalizeQuote(Number(row?.usd_to_aed));
      if (!usdToIqd || !usdToAed) continue;
      return {
        usdToIqd,
        usdToAed,
        updatedAt: row?.updated_at ?? null,
        source: "database",
      };
    }
    return envFallback;
  } catch {
    return envFallback;
  }
}
