import {
  canUseStripeCheckout,
  canUseZainCashCheckout,
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
  integration_mode?: "api" | "manual" | "disabled";
}

export interface ResolvedPaymentMethod extends MatrixMethodRow {
  available: boolean;
  disabledReason?: { ar: string; en: string };
  displayMode: "active" | "disabled" | "hidden";
}

/** Public catalog fields only — never account numbers / IBAN / merchant IDs. */
export interface PublicMethodDisplay {
  code: PaymentMethodCode;
  name_ar: string;
  name_en: string;
  currency_code: string;
  available: boolean;
  disabledReason?: { ar: string; en: string };
}

const IRAQ_CODES: PaymentMethodCode[] = ["fib", "superqi", "zain_cash", "bank_transfer"];
const UAE_CODES: PaymentMethodCode[] = ["stripe_card", "eand_money", "dupay", "bank_transfer"];
const WORLD_CODES: PaymentMethodCode[] = ["stripe_card", "bank_transfer"];

export function allowedMethodCodesForCountry(countryCode: string): PaymentMethodCode[] {
  if (countryCode === "IQ") return [...IRAQ_CODES];
  if (countryCode === "AE") return [...UAE_CODES];
  return [...WORLD_CODES];
}

/**
 * Resolve country payment methods with runtime provider gates.
 * Iraq: never Stripe. Names only for customer chooser — secrets stay server-side.
 */
export function resolvePaymentMethodsForCountry(
  rows: MatrixMethodRow[],
  countryCode: string,
): ResolvedPaymentMethod[] {
  const allowed = new Set(allowedMethodCodesForCountry(countryCode));
  const filtered = rows
    .filter((row) => row.country_code === countryCode && allowed.has(row.code))
    .sort((a, b) => a.sort_order - b.sort_order);

  return filtered
    .map((row) => {
      if (!row.enabled) {
        return { ...row, available: false, displayMode: "hidden" as const };
      }

      // Iraq: Stripe must never appear
      if (countryCode === "IQ" && row.code === "stripe_card") {
        return { ...row, available: false, displayMode: "hidden" as const };
      }

      if (row.code === "stripe_card") {
        if (countryCode !== "AE" && countryCode !== "OTHER" && countryCode !== "US" && countryCode !== "GB" && countryCode !== "EU") {
          // Only show Stripe for UAE + rest-of-world approved routing
          if (countryCode !== "AE" && !WORLD_CODES.includes("stripe_card")) {
            return { ...row, available: false, displayMode: "hidden" as const };
          }
        }
        if (canUseStripeCheckout()) {
          return { ...row, available: true, displayMode: "active" as const, requires_proof: false, requires_redirect: true };
        }
        // UAE: show disabled with message; never reveal secrets
        if (countryCode === "AE" || countryCode === "OTHER") {
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
        return { ...row, available: false, displayMode: "hidden" as const };
      }

      if (row.code === "zain_cash") {
        const api = canUseZainCashCheckout();
        return {
          ...row,
          available: true,
          displayMode: "active" as const,
          requires_proof: !api,
          requires_redirect: api,
          integration_mode: (api ? "api" : "manual") as "api" | "manual",
        };
      }

      if (row.code === "eand_money") {
        return {
          ...row,
          available: true,
          displayMode: "active" as const,
          requires_proof: true,
          requires_redirect: false,
          integration_mode: "manual" as const,
        };
      }

      if (row.code === "dupay") {
        return {
          ...row,
          available: true,
          displayMode: "active" as const,
          requires_proof: true,
          requires_redirect: false,
          integration_mode: "manual" as const,
        };
      }

      return { ...row, available: true, displayMode: "active" as const };
    })
    .filter((row) => row.displayMode !== "hidden");
}

/** Strip all settlement/account hints for pre-order chooser UI. */
export function toPublicMethodDisplays(methods: ResolvedPaymentMethod[]): PublicMethodDisplay[] {
  return methods.map((m) => ({
    code: m.code,
    name_ar: m.name_ar,
    name_en: m.name_en,
    currency_code: m.currency_code,
    available: m.available,
    disabledReason: m.disabledReason,
  }));
}

export function methodLabel(row: Pick<MatrixMethodRow, "name_ar" | "name_en">, locale: "ar" | "en"): string {
  return locale === "ar" ? row.name_ar : row.name_en;
}

export function fallbackMatrixForCountry(countryCode: string): MatrixMethodRow[] {
  const base = (partial: Omit<MatrixMethodRow, "id" | "payment_method_id"> & { code: PaymentMethodCode }): MatrixMethodRow => ({
    id: `${partial.country_code}-${partial.code}-${partial.currency_code}`,
    payment_method_id: `${partial.code}-fallback`,
    ...partial,
  });

  if (countryCode === "IQ") {
    return [
      base({ code: "fib", name_ar: "FIB", name_en: "FIB", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 10000, max_amount: 50000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 10, integration_mode: "manual" }),
      base({ code: "superqi", name_ar: "SuperQi", name_en: "SuperQi", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 10000, max_amount: 50000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 20, integration_mode: "manual" }),
      base({ code: "zain_cash", name_ar: "زين كاش", name_en: "Zain Cash", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 10000, max_amount: 50000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 30, integration_mode: "manual" }),
      base({ code: "bank_transfer", name_ar: "تحويل بنكي", name_en: "Bank Transfer", country_code: "IQ", currency_code: "IQD", enabled: true, min_amount: 50000, max_amount: 100000000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 40, integration_mode: "manual" }),
    ];
  }

  if (countryCode === "AE") {
    return [
      base({ code: "stripe_card", name_ar: "Stripe", name_en: "Stripe", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 10, max_amount: 200000, percentage_fee: 2.9, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: false, requires_redirect: true, provider_approval_status: "pending", sort_order: 10, integration_mode: "disabled" }),
      base({ code: "eand_money", name_ar: "e& money", name_en: "e& money", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 50, max_amount: 50000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 20, integration_mode: "manual" }),
      base({ code: "dupay", name_ar: "du Pay", name_en: "du Pay", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 50, max_amount: 50000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 30, integration_mode: "manual" }),
      base({ code: "bank_transfer", name_ar: "تحويل بنكي", name_en: "Bank Transfer", country_code: "AE", currency_code: "AED", enabled: true, min_amount: 100, max_amount: 500000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 40, integration_mode: "manual" }),
    ];
  }

  // Rest of world
  return [
    base({ code: "stripe_card", name_ar: "Stripe", name_en: "Stripe", country_code: "OTHER", currency_code: "USD", enabled: true, min_amount: 10, max_amount: 50000, percentage_fee: 2.9, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: false, requires_redirect: true, provider_approval_status: "pending", sort_order: 10, integration_mode: "disabled" }),
    base({ code: "bank_transfer", name_ar: "تحويل بنكي دولي", name_en: "International Bank Transfer", country_code: "OTHER", currency_code: "USD", enabled: true, min_amount: 50, max_amount: 250000, percentage_fee: 0, flat_fee: 0, settlement_time_text_ar: null, settlement_time_text_en: null, requires_proof: true, requires_redirect: false, provider_approval_status: "not_required", sort_order: 20, integration_mode: "manual" }),
  ];
}

export function assertMethodAllowedForCountry(countryCode: string, methodCode: string): boolean {
  return allowedMethodCodesForCountry(countryCode).includes(methodCode as PaymentMethodCode);
}
