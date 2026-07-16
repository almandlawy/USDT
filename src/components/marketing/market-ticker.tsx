"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw, TriangleAlert } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-data";
import type { Locale } from "@/lib/constants";

function formatMoney(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function MarketTicker({ locale, initial }: { locale: Locale; initial: MarketSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [loading, setLoading] = useState(false);
  const ar = locale === "ar";

  async function refresh() {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    setLoading(true);
    try {
      const response = await fetch("/api/market/prices", { cache: "no-store" });
      if (response.ok) setSnapshot(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const usdt = snapshot.assets.find((asset) => asset.symbol === "USDT");
  const status = snapshot.status || (snapshot.source === "fallback" ? "fallback" : snapshot.source === "coingecko+fx" ? "live_with_derived_fx" : "live");
  const label =
    status === "fallback"
      ? (ar ? "مزود الأسعار غير متاح" : "Market provider unavailable")
      : status === "live_with_derived_fx"
        ? (ar ? "أسعار حية مع صرف محسوب" : "Live prices with derived FX")
        : (ar ? "أسعار سوق استرشادية" : "Indicative market prices");

  return (
    <section className="marketStrip" aria-label={ar ? "أسعار السوق الاسترشادية" : "Indicative market prices"}>
      <div className="shell marketStripInner">
        <div className="marketLabel">
          <Activity />
          <span>
            <b>{label}</b>
            <small>
              {status === "fallback"
                ? (ar ? "BTC/ETH غير متاحة — USDT مرجعي تقريبي فقط" : "BTC/ETH unavailable — USDT approximate reference only")
                : status === "live_with_derived_fx"
                  ? (ar ? `IQD محسوب من USD (${snapshot.fxNote || "FX"})` : `IQD derived from USD (${snapshot.fxNote || "FX"})`)
                  : (ar ? "تحديث تلقائي كل دقيقة" : "Automatically refreshed every minute")}
            </small>
          </span>
        </div>
        <div className="marketAssets">
          {snapshot.assets.map((asset) => (
            <article key={asset.symbol}>
              <span>{asset.symbol}<small>{asset.name}</small></span>
              <strong>
                {asset.available === false || asset.usd == null
                  ? (ar ? "غير متاح" : "Unavailable")
                  : `$${asset.usd < 10 ? formatMoney(asset.usd, 4) : formatMoney(asset.usd, 2)}`}
              </strong>
              <em className={(asset.change24h || 0) >= 0 ? "up" : "down"}>
                {asset.change24h == null || asset.available === false
                  ? "—"
                  : `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%`}
              </em>
              {asset.symbol === "USDT" && asset.available !== false && (
                <small>
                  {formatMoney(asset.aed, 4)} AED · {formatMoney(asset.iqd, 2)} IQD
                </small>
              )}
            </article>
          ))}
        </div>
        <button className="marketRefresh" onClick={refresh} disabled={loading} aria-label={ar ? "تحديث الأسعار" : "Refresh prices"}>
          {status === "fallback" ? <TriangleAlert /> : <RefreshCw className={loading ? "spinning" : ""} />}
        </button>
      </div>
      <p className="marketDisclaimer shell">
        {ar
          ? "بيانات سوق استرشادية فقط — ليست عرض شراء أو بيع ملزماً. لا يتم تنفيذ معاملات مالية."
          : "Indicative market data only — not a binding buy or sell quote. No financial transactions are executed."}
        {status === "fallback" && snapshot.lastSuccessAt
          ? ` · ${ar ? "آخر نجاح" : "Last success"} ${new Date(snapshot.lastSuccessAt).toLocaleString(ar ? "ar-IQ" : "en-GB")}`
          : usdt?.available !== false
            ? ` · ${ar ? "آخر تحديث" : "Updated"} ${new Date(snapshot.fetchedAt).toLocaleString(ar ? "ar-IQ" : "en-GB")}`
            : null}
      </p>
    </section>
  );
}
