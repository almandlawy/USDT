"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Clock3, LockKeyhole } from "lucide-react";
import type { Locale } from "@/lib/constants";
import { createOrderAction } from "@/app/[locale]/dashboard/actions";

export type PricingOption = {
  fiatCurrency: "USD" | "AED" | "IQD";
  network: "TRC20" | "ERC20";
  referenceRate: number;
  flatFee: number;
  percentageFee: number;
  minAmount: number;
  maxAmount: number | null;
  quoteTtlSeconds: number;
};

export type PaymentOption = { id: string; name: string; code: string; minAmount: number | null; maxAmount: number | null };

const TRC20_EXAMPLE = "T9yD14Nj9j7xAB4dbGeiX9h8unkzUcsnQP";
const ERC20_EXAMPLE = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

export function RequestForm({ locale, type, pricing, paymentMethods }: { locale: Locale; type: "buy" | "sell"; pricing: PricingOption[]; paymentMethods: PaymentOption[] }) {
  const ar = locale === "ar";
  const [currency, setCurrency] = useState<"USD" | "AED" | "IQD">("USD");
  const [network, setNetwork] = useState<"TRC20" | "ERC20">("TRC20");
  const [amount, setAmount] = useState("");
  const rule = useMemo(() => pricing.find((item) => item.fiatCurrency === currency && item.network === network), [pricing, currency, network]);
  const numeric = Number(amount) || 0;
  const fee = rule ? rule.flatFee + (numeric * rule.percentageFee) / 100 : 0;
  const total = type === "buy" ? numeric + fee : Math.max(0, numeric - fee);
  const usdt = rule?.referenceRate ? numeric / rule.referenceRate : 0;
  const walletPattern = network === "TRC20" ? "^T[1-9A-HJ-NP-Za-km-z]{33}$" : "^0x[a-fA-F0-9]{40}$";
  const walletExample = network === "TRC20" ? TRC20_EXAMPLE : ERC20_EXAMPLE;
  const walletHint = network === "TRC20"
    ? (ar ? `TRC20: يبدأ بـ T وطوله 34 حرفاً. مثال: ${TRC20_EXAMPLE}` : `TRC20: starts with T, 34 chars. Example: ${TRC20_EXAMPLE}`)
    : (ar ? `ERC20: يبدأ بـ 0x وطوله 42 حرفاً. مثال: ${ERC20_EXAMPLE}` : `ERC20: starts with 0x, 42 chars. Example: ${ERC20_EXAMPLE}`);

  return (
    <form className="panel requestForm" action={createOrderAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderType" value={type} />
      <div className="panelHeading">
        <div>
          <span>NEW {type.toUpperCase()} REQUEST</span>
          <h2>{ar ? (type === "buy" ? "طلب شراء USDT" : "طلب بيع USDT") : `${type === "buy" ? "Buy" : "Sell"} USDT request`}</h2>
        </div>
        <span className="lockedPill">
          <LockKeyhole size={14} />
          {ar ? "طلب تجريبي — التنفيذ مقفول" : "Demo request — execution locked"}
        </span>
      </div>
      <div className="formGrid">
        <label>
          <span>{ar ? "العملة" : "Currency"}</span>
          <select name="fiatCurrency" value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>
            <option>USD</option>
            <option>AED</option>
            <option>IQD</option>
          </select>
        </label>
        <label>
          <span>{ar ? "الشبكة" : "Network"}</span>
          <select name="network" value={network} onChange={(event) => setNetwork(event.target.value as typeof network)}>
            <option>TRC20</option>
            <option>ERC20</option>
          </select>
        </label>
        <label>
          <span>{ar ? "المبلغ" : "Amount"}</span>
          <input name="amount" type="number" min={rule?.minAmount || 1} max={rule?.maxAmount || undefined} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          <small>{rule ? `${ar ? "الحد" : "Limit"}: ${rule.minAmount.toLocaleString()}${rule.maxAmount ? ` — ${rule.maxAmount.toLocaleString()}` : ""} ${currency}` : (ar ? "لا يوجد تسعير لهذا الاختيار" : "No pricing rule for this selection")}</small>
        </label>
        <label>
          <span>{ar ? "طريقة الدفع التجريبية" : "Demo payment method"}</span>
          <select name="paymentMethodId" required defaultValue="">
            <option value="" disabled>{ar ? "اختر طريقة" : "Choose a method"}</option>
            {paymentMethods.map((method) => <option value={method.id} key={method.id}>{method.name}</option>)}
          </select>
        </label>
        <label className="fullField">
          <span>{ar ? "عنوان محفظتك لاستلام USDT" : "Your wallet address to receive USDT"}</span>
          <input
            name="walletAddress"
            placeholder={walletExample}
            pattern={walletPattern}
            title={walletHint}
            minLength={network === "TRC20" ? 34 : 42}
            maxLength={network === "TRC20" ? 34 : 42}
            spellCheck={false}
            autoComplete="off"
            required
          />
          <small>{walletHint}</small>
        </label>
        <label className="fullField">
          <span>{ar ? "غرض المعاملة" : "Transaction purpose"}</span>
          <textarea name="transactionPurpose" rows={3} minLength={5} required />
        </label>
        <label className="fullField">
          <span>{ar ? "ملاحظات" : "Notes"}</span>
          <textarea name="customerNote" rows={2} />
        </label>
      </div>
      <div className="quotePreview">
        <div><Calculator /><span>{ar ? "السعر الاسترشادي" : "Indicative rate"}</span><strong>{rule ? `${rule.referenceRate.toLocaleString()} ${currency}/USDT` : "—"}</strong></div>
        <div><span>{ar ? "USDT التقديري" : "Estimated USDT"}</span><strong>{usdt ? usdt.toFixed(4) : "—"}</strong></div>
        <div><span>{ar ? "الرسوم" : "Fees"}</span><strong>{rule ? `${fee.toFixed(2)} ${currency}` : "—"}</strong></div>
        <div><span>{ar ? "الإجمالي" : "Total"}</span><strong>{rule ? `${total.toFixed(2)} ${currency}` : "—"}</strong></div>
        <div><Clock3 /><span>{ar ? "صلاحية العرض" : "Quote expiry"}</span><QuoteTimer key={`${currency}-${network}`} initial={rule?.quoteTtlSeconds || 0} /></div>
      </div>
      <button className="primaryButton" type="submit" disabled={!rule || !paymentMethods.length}>{ar ? "إنشاء طلب تجريبي" : "Create demo request"}</button>
      <p className="formNotice">{ar ? "هذا السعر استرشادي. لن يتم استلام أموال أو تحويل أو إطلاق USDT في وضع ما قبل الإطلاق." : "This rate is indicative. No funds are accepted and no USDT is transferred or released in pre-launch mode."}</p>
    </form>
  );
}

function QuoteTimer({ initial }: { initial: number }) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return <strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong>;
}
