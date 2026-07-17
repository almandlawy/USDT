"use client";

import { useMemo, useState } from "react";
import { CountrySelector } from "@/components/marketing/country-selector";
import { COUNTRY_SEED, type CountryRecord } from "@/lib/countries/catalog";
import {
  fallbackMatrixForCountry,
  methodLabel,
  resolvePaymentMethodsForCountry,
  type MatrixMethodRow,
} from "@/lib/payments/matrix";

export function CountryPaymentPanel({
  locale,
  countries = COUNTRY_SEED,
  matrixRows,
  suggestedCode,
}: {
  locale: "ar" | "en";
  countries?: CountryRecord[];
  matrixRows?: MatrixMethodRow[];
  suggestedCode?: string | null;
}) {
  const ar = locale === "ar";
  const orderable = countries.filter((c) => c.enabled && !c.sanctions_blocked && c.risk_level !== "blocked");
  const initial = suggestedCode && orderable.some((c) => c.code === suggestedCode) ? suggestedCode : orderable[0]?.code || "OTHER";
  const [country, setCountry] = useState(initial);

  const methods = useMemo(() => {
    const rows = (matrixRows?.length ? matrixRows : fallbackMatrixForCountry(country)).filter((r) => r.country_code === country);
    const source = rows.length ? rows : fallbackMatrixForCountry(country);
    return resolvePaymentMethodsForCountry(source, country);
  }, [country, matrixRows]);

  const selected = orderable.find((c) => c.code === country);

  return (
    <section id="country" className="sectionBlock countryPaymentSection">
      <div className="shell countryPaymentGrid">
        <div>
          <span className="sectionKicker">{ar ? "اختيار الدولة" : "Country selection"}</span>
          <h2>{ar ? "من أي دولة تريد الشراء؟" : "Which country do you want to buy from?"}</h2>
          <p>
            {ar
              ? "اقتراح الموقع الجغرافي اختياري فقط. أنت تختار الدولة، ونعرض وسائل الدفع المناسبة لها."
              : "IP geolocation is a suggestion only. You choose the country, and we show matching payment methods."}
          </p>
          <CountrySelector
            locale={locale}
            countries={orderable}
            suggestedCode={suggestedCode}
            value={country}
            onChange={setCountry}
          />
        </div>
        <div>
          <span className="sectionKicker">{ar ? "وسائل الدفع" : "Payment methods"}</span>
          <h2>
            {ar ? "المتاح لـ" : "Available for"} {selected ? (ar ? selected.name_ar : selected.name_en) : country}
          </h2>
          <p>
            {ar
              ? `العملة الرئيسية: ${selected?.currency_code || "—"} · لا يُنفَّذ تسليم تلقائي في هذه المرحلة.`
              : `Primary currency: ${selected?.currency_code || "—"} · No automatic fulfillment in this phase.`}
          </p>
          <ul className="paymentMethodMatrix">
            {methods.map((method) => (
              <li key={method.id} className={method.available ? "isAvailable" : "isDisabled"}>
                <div>
                  <strong>{methodLabel(method, locale)}</strong>
                  <span>
                    {method.currency_code}
                    {method.requires_proof ? (ar ? " · يتطلب إثباتاً" : " · proof required") : ""}
                    {method.requires_redirect ? (ar ? " · تحويل للبوابة" : " · gateway redirect") : ""}
                  </span>
                </div>
                {!method.available && method.disabledReason ? (
                  <p className="methodHint">{locale === "ar" ? method.disabledReason.ar : method.disabledReason.en}</p>
                ) : method.disabledReason ? (
                  <p className="methodHint">{locale === "ar" ? method.disabledReason.ar : method.disabledReason.en}</p>
                ) : (
                  <p className="methodHint">
                    {locale === "ar" ? method.settlement_time_text_ar : method.settlement_time_text_en}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
