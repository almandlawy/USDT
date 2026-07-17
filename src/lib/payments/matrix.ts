import {
  canUseStripeCheckout,
  canUseZainCashCheckout,
  isBankTransferEnabled,
  isDuPayEnabled,
  isEandMoneyEnabled,
  stripeAvailabilityMessage,
} from "@/lib/payments/flags";

export type PaymentMethodCode =
  | "bank_transfer"
  | "fib"
  | "superqi"
  | "zain_cash"
  | "cash_representative"
  | "wallet_transfer"
  | "stripe_card"
  | "eand_money"
  | "dupay"
  | "manual_proof";

export interface MatrixMethodRow {
  id: string;
  payment_method_id: string;
  code: PaymentMethodCode;
  name_ar: string;
  name_en: string;
  country_code: string;
  currency_code: string;
  enabled: boolean;
  min_amount: number | null;
  max_amount: number | null;
  percentage_fee: number;
  flat_fee: number;
  settlement_time_text_ar: string | null;
  settlement_time_text_en: string | null;
  requires_proof: boolean;
  requires_redirect: boolean;
  provider_approval_status: string;
  sort_order: number;
  integration_mode?: string;
}

export interface ResolvedPaymentMethod extends MatrixMethodRow {
  available: boolean;
  disabledReason?: { ar: string; en: string };
  displayMode: "active" | "disabled" | "hidden";
}

/**
 * Resolve country payment methods with runtime provider gates.
 * Stripe is hidden/disabled unless crypto-approved + enabled + real payments.
 * Manual UAE wallets require enable flags and never claim automatic confirmation.
 */
export function resolvePaymentMethodsForCountry(
  rows: MatrixMethodRow[],
  countryCode: string,
): ResolvedPaymentMethod[] {
  const filtered = rows
    .filter((row) => row.country_code === countryCode)
    .sort((a, b) => a.sort_order - b.sort_order);

  return filtered.map((row) => {
    if (!row.enabled) {
      return { ...row, available: false, displayMode: "hidden" as const };
    }

    if (row.code === "stripe_card") {
      if (canUseStripeCheckout() && row.provider_approval_status === "approved") {
        return { ...row, available: true, displayMode: "active" as const };
      }
      return {
        ...row,
        available: false,
        displayMode: "disabled" as const,
        disabledReason: {
          ar: stripeAvailabilityMessage("ar"),
          en: stripeAvailabilityMessage("en"),
        },
      };
    }

    if (row.code === "zain_cash") {
      if (canUseZainCashCheckout()) {
        return { ...row, available: true, displayMode: "active" as const };
      }
      // Show as available for intake/manual path when matrix enabled but gateway off —
      // customer still uploads proof / waits for activation messaging.
      return {
        ...row,
        available: true,
        displayMode: "active" as const,
        requires_proof: true,
        requires_redirect: false,
        disabledReason: {
          ar: "زين كاش جاهز لاستقبال الطلب؛ التحويل التلقائي عبر البوابة يُفعّل بعد الاعتماد وبيانات الإنتاج.",
          en: "Zain Cash accepts the request; live gateway redirect activates after approval and production credentials.",
        },
      };
    }

    if (row.code === "eand_money") {
      return {
        ...row,
        available: true,
        displayMode: "active" as const,
        requires_proof: true,
        requires_redirect: false,
        disabledReason: isEandMoneyEnabled()
          ? undefined
          : {
              ar: "وضع يدوي — يظهر رقم/QR فقط بعد إعداد الإدارة.",
              en: "Manual mode — phone/QR appear only after admin configuration.",
            },
      };
    }

    if (row.code === "dupay") {
      return {
        ...row,
        available: true,
        displayMode: "active" as const,
        requires_proof: true,
        requires_redirect: false,
        disabledReason: isDuPayEnabled()
          ? undefined
          : {
              ar: "وضع يدوي — بدون ادعاء شراكة أو تكامل تلقائي.",
              en: "Manual mode — no partnership claim or automatic integration.",
            },
      };
    }

    if (row.code === "bank_transfer") {
      if (!isBankTransferEnabled()) {
        // Still show when matrix says enabled — bank details revealed after order.
        return { ...row, available: true, displayMode: "active" as const };
      }
      return { ...row, available: true, displayMode: "active" as const };
    }

    return { ...row, available: true, displayMode: "active" as const };
  }).filter((row) => row.displayMode !== "hidden");
}

export function methodLabel(row: Pick<MatrixMethodRow, "name_ar" | "name_en">, locale: "ar" | "en"): string {
  return locale === "ar" ? row.name_ar : row.name_en;
}

/** Fallback matrix when DB is unavailable — mirrors migration seed (intake-safe, Stripe gated). */
export function fallbackMatrixForCountry(countryCode: string): MatrixMethodRow[] {
  const base = (partial: Omit<MatrixMethodRow, "id" | "payment_method_id"> & { code: PaymentMethodCode }): MatrixMethodRow => ({
    id: `${partial.country_code}-${partial.code}-${partial.currency_code}`,
    payment_method_id: `${partial.code}-fallback`,
    ...partial,
  });

  if (countryCode === "IQ") {
    return [
      base({ code: "zain_cash", name_ar: "زين كاش", name_en: "Zain Cash", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 10000, max_amount: 50000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "بعد تفعيل البوابة أو مراجعة الإثبات", settlement_time_text_en: "After gateway activation or proof review", requires_proof: true, requires_redirect: false, provider_approval_status: "pending", sort_order: 10 }),
      base({ code: "stripe_card", name_ar: "بطاقة Stripe", name_en: "Stripe Card", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 5, max_amount: 100000, percentage_fee: 2.9, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: false, requires_redirect: true, provider_approval_status: "pending", sort_order: 20 }),
      base({ code: "bank_transfer", name_ar: "تحويل بنكي", name_en: "Bank Transfer", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 50000, max_amount: 100000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "مراجعة بشرية", settlement_time_text_en: "Human review", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 30 }),
      base({ code: "manual_proof", name_ar: "إثبات يدوي", name_en: "Manual proof", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 10000, max_amount: 100000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "مراجعة بشرية", settlement_time_text_en: "Human review", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 40 }),
    ];
  }

  if (countryCode === "AE") {
    return [
      base({ code: "stripe_card", name_ar: "بطاقة Stripe", name_en: "Stripe Card", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 10, max_amount: 200000, percentage_fee: 2.9, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: false, requires_redirect: true, provider_approval_status: "pending", sort_order: 10 }),
      base({ code: "eand_money", name_ar: "e& money (يدوي)", name_en: "e& money (manual)", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 50, max_amount: 50000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "يدوي", settlement_time_text_en: "Manual", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 20 }),
      base({ code: "dupay", name_ar: "du Pay (يدوي)", name_en: "du Pay (manual)", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 50, max_amount: 50000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "يدوي", settlement_time_text_en: "Manual", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 30 }),
      base({ code: "bank_transfer", name_ar: "تحويل بنكي", name_en: "Bank Transfer", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 100, max_amount: 500000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "مراجعة بشرية", settlement_time_text_en: "Human review", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 40 }),
      base({ code: "manual_proof", name_ar: "إثبات يدوي", name_en: "Manual proof", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 50, max_amount: 500000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "مراجعة بشرية", settlement_time_text_en: "Human review", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 50 }),
    ];
  }

  const currency =
    countryCode === "SA" ? "SAR" :
    countryCode === "QA" ? "QAR" :
    countryCode === "KW" ? "KWD" :
    countryCode === "BH" ? "BHD" :
    countryCode === "OM" ? "OMR" :
    countryCode === "GB" ? "GBP" :
    countryCode === "EU" ? "EUR" : "USD";

  return [
    base({ code: "stripe_card", name_ar: "بطاقة Stripe", name_en: "Stripe Card", country_code: countryCode, currency_code: currency, enabled: true, min_amount: 10, max_amount: 50000, percentage_fee: 2.9, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: false, requires_redirect: true, provider_approval_status: "pending", sort_order: 10 }),
    base({ code: "bank_transfer", name_ar: "تحويل بنكي", name_en: "Bank Transfer", country_code: countryCode, currency_code: currency, enabled: true, min_amount: 50, max_amount: 250000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "مراجعة بشرية", settlement_time_text_en: "Human review", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 20 }),
    base({ code: "manual_proof", name_ar: "إثبات يدوي", name_en: "Manual proof", country_code: countryCode, currency_code: currency, enabled: true, min_amount: 25, max_amount: 250000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: "مراجعة بشرية", settlement_time_text_en: "Human review", requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 30 }),
  ];
}
