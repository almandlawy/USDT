import "server-only";
import { getUsdToAedRate, getUsdToIqdRate, normalizeQuote } from "@/lib/market-quotes";

export type MarketFxSettings = {
  usdToIqd: number;
  usdToAed: number;
  notes: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  source: "database" | "environment";
};

/**
 * Load indicative FX from market_fx_settings when reachable; otherwise env defaults.
 * Never treats zero/negative as valid. Does not unlock LIVE_TRADING.
 */
export async function getMarketFxSettings(): Promise<MarketFxSettings> {
  const envFallback: MarketFxSettings = {
    usdToIqd: getUsdToIqdRate(),
    usdToAed: getUsdToAedRate(),
    notes: null,
    updatedAt: null,
    updatedBy: null,
    source: "environment",
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return envFallback;

  try {
    const response = await fetch(
      `${url}/rest/v1/market_fx_settings?id=eq.1&select=usd_to_iqd,usd_to_aed,notes,updated_at,updated_by`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
        next: { revalidate: 60, tags: ["market-fx"] },
        signal: AbortSignal.timeout(2500),
      },
    );
    if (!response.ok) return envFallback;
    const rows = (await response.json()) as Array<{
      usd_to_iqd?: number;
      usd_to_aed?: number;
      notes?: string | null;
      updated_at?: string | null;
      updated_by?: string | null;
    }>;
    const row = rows[0];
    const usdToIqd = normalizeQuote(Number(row?.usd_to_iqd));
    const usdToAed = normalizeQuote(Number(row?.usd_to_aed));
    if (!usdToIqd || !usdToAed) return envFallback;
    return {
      usdToIqd,
      usdToAed,
      notes: row?.notes ?? null,
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
      source: "database",
    };
  } catch {
    return envFallback;
  }
}
