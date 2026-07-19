"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, LockKeyhole } from "lucide-react";
import type { Locale } from "@/lib/constants";

type DeskRates = {
  usdtUsd: number;
  usdtAed: number;
  usdtIqd: number;
  stale: boolean;
  status?: "live" | "live_with_derived_fx" | "fallback";
};

function publicEnabled(value: string | undefined) {
  return ["1", "true", "enabled", "yes"].includes((value || "").trim().toLowerCase());
}

export function ExchangeDesk({
  locale,
  rates,
  registerHref,
}: {
  locale: Locale;
  rates: DeskRates;
  registerHref: string;
}) {
  const ar = locale === "ar";
  const paymentsEnabled = publicEnabled(process.env.NEXT_PUBLIC_REAL_PAYMENTS_ENABLED);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [fiat, setFiat] = useState<"IQD" | "USD" | "AED">("AED");
  const [amount, setAmount] = useState("10000");

  const unit = useMemo(() => {
    if (fiat === "USD") return rates.usdtUsd || 1;
    if (fiat === "AED") return rates.usdtAed || rates.usdtUsd * 3.6725;
    return rates.usdtIqd > 0 ? rates.usdtIqd : 0;
  }, [fiat, rates]);

  const parsed = Number(amount.replace(/,/g, "")) || 0;
  const quote = useMemo(() => {
    if (!unit || unit <= 0) return { quantity: 0, amount: 0 };
    if (mode === "buy") return { quantity: parsed / unit, amount: parsed };
    return { quantity: parsed, amount: parsed * unit };
  }, [mode, parsed, unit]);

  const formatFiat = (value: number) =>
    value.toLocaleString(ar ? "ar-IQ" : "en-US", { maximumFractionDigits: fiat === "IQD" ? 0 : 2 });
  const formatUsdt = (value: number) =>
    value.toLocaleString("en-US", { maximumFractionDigits: value < 10 ? 4 : 2 });

  const status = rates.status || (rates.stale ? "fallback" : "live");
  const statusLabel =
    status === "fallback"
      ? ar
        ? "مزود الأسعار غير متاح"
        : "Market provider unavailable"
      : status === "live_with_derived_fx"
        ? ar
          ? "حي مع صرف محسوب"
          : "Live with derived FX"
        : ar
          ? "سعر استرشادي محدّث"
          : "Updated indicative rate";

  return (
    <div className="exchangeDesk" aria-label={ar ? "حاسبة أسعار استرشادية" : "Indicative exchange desk"}>
      <div className="exchangeDeskTop">
        <div className="exchangeTabs" role="tablist">
          <button type="button" className={mode === "buy" ? "active" : ""} onClick={() => setMode("buy")}>
            {ar ? "شراء" : "Buy"}
          </button>
          <button type="button" className={mode === "sell" ? "active" : ""} onClick={() => setMode("sell")}>
            {ar ? "بيع" : "Sell"}
          </button>
        </div>
        <span className={`exchangeBadge${paymentsEnabled ? " operational" : ""}`}>
          {paymentsEnabled ? <CheckCircle2 size={13} /> : <LockKeyhole size={13} />}
          {paymentsEnabled
            ? ar
              ? "استقبال الطلبات مفعّل"
              : "Requests enabled"
            : ar
              ? "استرشادي — بدون تنفيذ"
              : "Indicative — no execution"}
        </span>
      </div>

      <div className="exchangeField">
        <div>
          <small>{mode === "buy" ? (ar ? "أنت تدفع" : "You pay") : ar ? "أنت تبيع" : "You sell"}</small>
          <strong>{mode === "buy" ? fiat : "USDT"}</strong>
        </div>
        {mode === "buy" ? (
          <select value={fiat} onChange={(event) => setFiat(event.target.value as typeof fiat)} aria-label={ar ? "العملة" : "Fiat currency"}>
            <option value="AED">AED</option>
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
          </select>
        ) : (
          <span className="assetChip"><i className="assetUsdt" aria-hidden />USDT</span>
        )}
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={ar ? "المبلغ" : "Amount"}
        />
      </div>

      <div className="exchangeSwap" aria-hidden><ArrowLeftRight size={16} /></div>

      <div className="exchangeField resultField">
        <div>
          <small>{ar ? "ستحصل تقريباً على" : "You may receive"}</small>
          <strong>{mode === "buy" ? "USDT" : fiat}</strong>
        </div>
        {mode === "buy" ? (
          <span className="assetChip"><i className="assetUsdt" aria-hidden />USDT</span>
        ) : (
          <select value={fiat} onChange={(event) => setFiat(event.target.value as typeof fiat)} aria-label={ar ? "العملة" : "Fiat currency"}>
            <option value="AED">AED</option>
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
          </select>
        )}
        <output>
          {!unit || unit <= 0
            ? ar ? "غير متاح" : "Unavailable"
            : mode === "buy" ? formatUsdt(quote.quantity) : formatFiat(quote.amount)}
        </output>
      </div>

      <dl className="exchangeBreakdown">
        <div>
          <dt>{ar ? "السعر الاسترشادي" : "Indicative rate"}</dt>
          <dd>{!unit || unit <= 0 ? (ar ? "غير محدد حالياً" : "Not available") : `1 USDT ≈ ${formatFiat(unit)} ${fiat}`}</dd>
        </div>
        <div>
          <dt>{ar ? "الرسوم" : "Fees"}</dt>
          <dd>{ar ? "تظهر داخل الطلب قبل التأكيد" : "Shown inside the request before confirmation"}</dd>
        </div>
        <div>
          <dt>{ar ? "حالة السعر" : "Rate status"}</dt>
          <dd>{statusLabel}</dd>
        </div>
      </dl>

      <Link className="primaryButton wide exchangeCta" href={registerHref}>
        {paymentsEnabled ? (ar ? "إنشاء طلب الآن" : "Create a request") : (ar ? "ابدأ بطلب" : "Start a request")}
      </Link>
      <p className="exchangeNote">
        {paymentsEnabled
          ? ar
            ? "السعر المعروض استرشادي حتى تثبيته داخل الطلب. الدفع والتسليم يخضعان للمراجعة وحالة مزود الدفع."
            : "The displayed rate remains indicative until locked inside a request. Payment and fulfillment remain subject to review and provider status."
          : ar
            ? "الأسعار للمعاينة فقط وغير ملزمة، ولا يتم تنفيذ دفع أو تسليم قبل تفعيل مسارات التشغيل."
            : "Rates are non-binding previews, and no payment or fulfillment runs until operational routes are enabled."}
      </p>
    </div>
  );
}
