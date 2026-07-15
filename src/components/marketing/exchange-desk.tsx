"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, LockKeyhole } from "lucide-react";
import type { Locale } from "@/lib/constants";

type DeskRates = {
  usdtUsd: number;
  usdtAed: number;
  usdtIqd: number;
  stale: boolean;
};

const FEE_BPS = 35; // indicative desk spread preview only

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
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [fiat, setFiat] = useState<"IQD" | "USD" | "AED">("IQD");
  const [amount, setAmount] = useState("1000000");

  const unit = useMemo(() => {
    if (fiat === "USD") return rates.usdtUsd || 1;
    if (fiat === "AED") return rates.usdtAed || rates.usdtUsd * 3.6725;
    return rates.usdtIqd > 0 ? rates.usdtIqd : 1310;
  }, [fiat, rates]);

  const parsed = Number(amount.replace(/,/g, "")) || 0;
  const feeRate = FEE_BPS / 10000;
  const quote = useMemo(() => {
    if (mode === "buy") {
      const gross = parsed / unit;
      const fee = gross * feeRate;
      return { quantity: Math.max(gross - fee, 0), amount: parsed, fee: fee * unit };
    }
    const amountOut = parsed * unit;
    const fee = amountOut * feeRate;
    return { quantity: parsed, amount: Math.max(amountOut - fee, 0), fee };
  }, [feeRate, mode, parsed, unit]);

  const formatFiat = (value: number) =>
    value.toLocaleString(ar ? "ar-IQ" : "en-US", { maximumFractionDigits: fiat === "IQD" ? 0 : 2 });
  const formatUsdt = (value: number) =>
    value.toLocaleString("en-US", { maximumFractionDigits: value < 10 ? 4 : 2 });

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
        <span className="exchangeBadge">
          <LockKeyhole size={13} />
          {ar ? "استرشادي — بدون تنفيذ" : "Indicative — no execution"}
        </span>
      </div>

      <div className="exchangeField">
        <div>
          <small>{mode === "buy" ? (ar ? "أنت ترسل" : "You send") : ar ? "أنت تبيع" : "You sell"}</small>
          <strong>
            {mode === "buy" ? fiat : "USDT"}
          </strong>
        </div>
        {mode === "buy" ? (
          <select value={fiat} onChange={(event) => setFiat(event.target.value as typeof fiat)} aria-label="Fiat">
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
            <option value="AED">AED</option>
          </select>
        ) : (
          <span className="assetChip">
            <i className="assetUsdt" aria-hidden />
            USDT
          </span>
        )}
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={ar ? "المبلغ" : "Amount"}
        />
      </div>

      <div className="exchangeSwap" aria-hidden>
        <ArrowLeftRight size={16} />
      </div>

      <div className="exchangeField resultField">
        <div>
          <small>{mode === "buy" ? (ar ? "ستحصل تقريباً على" : "You may receive") : ar ? "ستحصل تقريباً على" : "You may receive"}</small>
          <strong>{mode === "buy" ? "USDT" : fiat}</strong>
        </div>
        {mode === "buy" ? (
          <span className="assetChip">
            <i className="assetUsdt" aria-hidden />
            USDT
          </span>
        ) : (
          <select value={fiat} onChange={(event) => setFiat(event.target.value as typeof fiat)} aria-label="Fiat">
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
            <option value="AED">AED</option>
          </select>
        )}
        <output>
          {mode === "buy" ? formatUsdt(quote.quantity) : formatFiat(quote.amount)}
        </output>
      </div>

      <dl className="exchangeBreakdown">
        <div>
          <dt>{ar ? "السعر الاسترشادي" : "Indicative rate"}</dt>
          <dd>
            1 USDT ≈ {formatFiat(unit)} {fiat}
          </dd>
        </div>
        <div>
          <dt>{ar ? "رسوم تقديرية" : "Estimated fee"}</dt>
          <dd>
            {formatFiat(quote.fee)} {fiat}
          </dd>
        </div>
        <div>
          <dt>{ar ? "الحالة" : "Status"}</dt>
          <dd>{rates.stale ? (ar ? "بيانات احتياطية" : "Fallback data") : ar ? "محدّث" : "Live feed"}</dd>
        </div>
      </dl>

      <Link className="primaryButton wide exchangeCta" href={registerHref}>
        {ar ? "ابدأ بطلب تجريبي" : "Start a demo request"}
      </Link>
      <p className="exchangeNote">
        {ar
          ? "الأسعار للمعاينة فقط. لا يُنفَّذ إيداع أو تحويل أو إطلاق USDT في وضع ما قبل الإطلاق."
          : "Prices are for preview only. No deposit, transfer or USDT release runs in pre-launch mode."}
      </p>
    </div>
  );
}
