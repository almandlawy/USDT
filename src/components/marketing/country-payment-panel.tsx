"use client";

import { useMemo, useState } from "react";
import { CountrySelector } from "@/components/marketing/country-selector";
import { primaryCountries, type CountryRecord } from "@/lib/countries/catalog";
import {
  fallbackMatrixForCountry,
  resolvePaymentMethodsForCountry,
  toPublicMethodDisplays,
  type MatrixMethodRow,
} from "@/lib/payments/matrix";

/**
 * Pre-order country + method chooser.
 * Shows method names only — never account numbers, IBAN, phones, merchant IDs, or UAE company legal details for Iraq.
 */
export function CountryPaymentPanel({
  locale,
  countries,
  matrixRows,
  suggestedCode,
}: {
  locale: "ar" | "en";
  countries?: CountryRecord[];
  matrixRows?: MatrixMethodRow[];
  suggestedCode?: string | null;
}) {
  const ar = locale === "ar";
  const orderable = primaryCountries(countries);
  const initial =
    suggestedCode && orderable.some((c) => c.code === suggestedCode) ? suggestedCode : orderable[0]?.code || "OTHER";
  const [country, setCountry] = useState(initial);

  const methods = useMemo(() => {
    const rows = (matrixRows?.length ? matrixRows : fallbackMatrixForCountry(country)).filter(
      (r) => r.country_code === country,
    );
    const source = rows.length ? rows : fallbackMatrixForCountry(country);
    return toPublicMethodDisplays(resolvePaymentMethodsForCountry(source, country));
  }, [country, matrixRows]);

  const selected = orderable.find((c) => c.code === country);
  const hideUaeLegal = country === "IQ";

  return (
    <section id="country" className="sectionBlock countryPaymentSection">
      <div className="shell countryPaymentGrid">
        <div>
          <span className="sectionKicker">{ar ? "اختيار الدولة" : "Country selection"}</span>
          <h2>{ar ? "اختر دولة الدفع" : "Choose payment country"}</h2>
          <p>
            {ar
              ? "العراق، الإمارات، أو باقي دول العالم. اقتراح الموقع اختياري ويمكن تعديله."
              : "Iraq, UAE, or rest of world. Location suggestion is optional and editable."}
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
              ? `العملة: ${selected?.currency_code || "—"} · تظهر تعليمات الدفع فقط بعد إنشاء الطلب.`
              : `Currency: ${selected?.currency_code || "—"} · Payment instructions appear only after order creation.`}
          </p>
          {hideUaeLegal ? (
            <p className="methodHint">
              {ar
                ? "مسار عراقي مستقل — لا تُعرض بيانات الشركة الإماراتية أو معرفات التجار هنا."
                : "Iraq-specific path — UAE company details and merchant IDs are not shown here."}
            </p>
          ) : null}
          <ul className="paymentMethodMatrix paymentMethodNamesOnly">
            {methods.map((method) => (
              <li key={method.code} className={method.available ? "isAvailable" : "isDisabled"}>
                <div>
                  <strong>{locale === "ar" ? method.name_ar : method.name_en}</strong>
                  <span className="methodLogoBadge" aria-hidden>
                    {method.code === "fib"
                      ? "FIB"
                      : method.code === "superqi"
                        ? "SQ"
                        : method.code === "zain_cash"
                          ? "ZC"
                          : method.code === "stripe_card"
                            ? "S"
                            : method.code === "eand_money"
                              ? "e&"
                              : method.code === "dupay"
                                ? "du"
                                : "BT"}
                  </span>
                </div>
                {!method.available && method.disabledReason ? (
                  <p className="methodHint">{locale === "ar" ? method.disabledReason.ar : method.disabledReason.en}</p>
                ) : (
                  <p className="methodHint">
                    {ar ? "التفاصيل بعد إنشاء الطلب" : "Details after order creation"}
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
