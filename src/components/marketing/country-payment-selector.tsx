"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  Landmark,
  LockKeyhole,
  Smartphone,
  WalletCards,
} from "lucide-react";
import type { Locale } from "@/lib/constants";

type ProviderFlags = {
  stripe: boolean;
  fib: boolean;
  superqi: boolean;
  zainCash: boolean;
  eandMoney: boolean;
  duPay: boolean;
  bankTransfer: boolean;
};

type RegionCode = "IQ" | "AE" | "GLOBAL";

type Method = {
  key: keyof ProviderFlags;
  name: string;
  description: string;
  mode: "gateway" | "manual";
  icon: typeof CreditCard;
};

export function CountryPaymentSelector({
  locale,
  providers,
}: {
  locale: Locale;
  providers: ProviderFlags;
}) {
  const ar = locale === "ar";
  const [region, setRegion] = useState<RegionCode>("AE");

  const copy = useMemo(
    () => ({
      IQ: {
        name: ar ? "العراق" : "Iraq",
        currency: "IQD",
        note: ar
          ? "تظهر للعميل وسيلة الدفع المختارة فقط بعد إنشاء الطلب، مع مرجع خاص ورفع إثبات عند الحاجة."
          : "Only the selected route is revealed after an order is created, with a unique reference and proof upload when needed.",
        methods: [
          { key: "fib", name: "FIB", description: ar ? "بوابة أو دفع يدوي حسب إعداد التاجر" : "Gateway or manual route based on merchant setup", mode: "gateway", icon: Landmark },
          { key: "superqi", name: "SuperQi", description: ar ? "دفع محلي بالدينار العراقي" : "Local IQD payment route", mode: "gateway", icon: WalletCards },
          { key: "zainCash", name: "Zain Cash", description: ar ? "تحويل أو بوابة تاجر عند تفعيلها" : "Transfer or merchant gateway when enabled", mode: "gateway", icon: Smartphone },
          { key: "bankTransfer", name: ar ? "تحويل بنكي عراقي" : "Iraqi bank transfer", description: ar ? "مرجع طلب منفصل ومراجعة إثبات" : "Unique order reference and proof review", mode: "manual", icon: Building2 },
        ] satisfies Method[],
      },
      AE: {
        name: ar ? "الإمارات" : "United Arab Emirates",
        currency: "AED",
        note: ar
          ? "مسارات الدفع الإماراتية تظهر حسب إعداد حساب التاجر والموافقة الفعلية لكل مزود."
          : "UAE payment routes appear according to the merchant configuration and approval for each provider.",
        methods: [
          { key: "stripe", name: "Stripe", description: ar ? "صفحة دفع مستضافة وتأكيد عبر Webhook" : "Hosted checkout with webhook confirmation", mode: "gateway", icon: CreditCard },
          { key: "eandMoney", name: "e& money", description: ar ? "ربط تاجر أو دفع يدوي حسب العقد" : "Merchant integration or manual route per agreement", mode: "gateway", icon: Smartphone },
          { key: "duPay", name: "du Pay", description: ar ? "ربط تاجر أو تعليمات دفع آمنة" : "Merchant integration or secure payment instructions", mode: "gateway", icon: Smartphone },
          { key: "bankTransfer", name: ar ? "تحويل بنكي إماراتي" : "UAE bank transfer", description: ar ? "مرجع دفع خاص بكل طلب" : "A unique payment reference for every order", mode: "manual", icon: Building2 },
        ] satisfies Method[],
      },
      GLOBAL: {
        name: ar ? "باقي دول العالم" : "Rest of the world",
        currency: "USD",
        note: ar
          ? "تظهر فقط الدول والعملات ووسائل الدفع المسموح بها من لوحة الإدارة."
          : "Only countries, currencies, and payment routes allowed by administration are shown.",
        methods: [
          { key: "stripe", name: "Stripe", description: ar ? "للدول والعملات المعتمدة فقط" : "Only for approved countries and currencies", mode: "gateway", icon: CreditCard },
          { key: "bankTransfer", name: ar ? "تحويل بنكي دولي" : "International bank transfer", description: ar ? "تفاصيل محدودة تظهر بعد إنشاء الطلب" : "Limited instructions appear after order creation", mode: "manual", icon: Globe2 },
        ] satisfies Method[],
      },
    }),
    [ar],
  );

  const selected = copy[region];

  return (
    <div className="countrySelector" data-region={region}>
      <div className="countryTabs" role="tablist" aria-label={ar ? "اختيار دولة الدفع" : "Select payment country"}>
        {(Object.keys(copy) as RegionCode[]).map((code) => (
          <button
            type="button"
            role="tab"
            aria-selected={region === code}
            className={region === code ? "active" : ""}
            onClick={() => setRegion(code)}
            key={code}
          >
            <span>{code === "IQ" ? "IQ" : code === "AE" ? "AE" : "GL"}</span>
            {copy[code].name}
          </button>
        ))}
      </div>

      <div className="countryPanel">
        <div className="countryPanelHeading">
          <span className="countryCurrency">{selected.currency}</span>
          <div>
            <small>{ar ? "مسار الدفع" : "Payment route"}</small>
            <h3>{selected.name}</h3>
            <p>{selected.note}</p>
          </div>
        </div>

        <div className="paymentRouteGrid">
          {selected.methods.map((method) => {
            const Icon = method.icon;
            const enabled = providers[method.key];
            return (
              <article className={enabled ? "enabled" : "pending"} key={`${region}-${method.key}`}>
                <div className="paymentRouteIcon"><Icon size={21} /></div>
                <div>
                  <h4>{method.name}</h4>
                  <p>{method.description}</p>
                </div>
                <span className="routeStatus">
                  {enabled ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}
                  {enabled ? (ar ? "مُعد" : "Configured") : (ar ? "بانتظار الربط" : "Awaiting setup")}
                </span>
              </article>
            );
          })}
        </div>

        <div className="countryPanelFooter">
          <p>{ar ? "لا تظهر أرقام الحسابات أو بيانات التاجر العامة قبل إنشاء طلب صالح." : "Account and merchant details are never exposed before a valid order is created."}</p>
          <Link className="primaryButton" href={`/${locale}/register`}>
            {ar ? "ابدأ طلبك" : "Start a request"}
          </Link>
        </div>
      </div>
    </div>
  );
}
