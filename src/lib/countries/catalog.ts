/**
 * Country catalog for payment routing.
 * DB is source of truth when Supabase is configured; this seed is the fallback + type contract.
 */

export type CountryRiskLevel = "low" | "medium" | "high" | "blocked";

export interface CountryRecord {
  code: string;
  name_ar: string;
  name_en: string;
  currency_code: string;
  dialing_code: string | null;
  enabled: boolean;
  kyc_required: boolean;
  risk_level: CountryRiskLevel;
  sanctions_blocked: boolean;
  payment_region: string;
  kyc_jurisdiction: string | null;
  sort_order: number;
}

export const COUNTRY_SEED: CountryRecord[] = [
  { code: "IQ", name_ar: "العراق", name_en: "Iraq", currency_code: "IQD", dialing_code: "+964", enabled: true, kyc_required: true, risk_level: "medium", sanctions_blocked: false, payment_region: "iraq", kyc_jurisdiction: "IQ", sort_order: 10 },
  { code: "AE", name_ar: "الإمارات", name_en: "United Arab Emirates", currency_code: "AED", dialing_code: "+971", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "uae", kyc_jurisdiction: "AE", sort_order: 20 },
  { code: "SA", name_ar: "السعودية", name_en: "Saudi Arabia", currency_code: "SAR", dialing_code: "+966", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "gcc", kyc_jurisdiction: "SA", sort_order: 30 },
  { code: "QA", name_ar: "قطر", name_en: "Qatar", currency_code: "QAR", dialing_code: "+974", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "gcc", kyc_jurisdiction: "QA", sort_order: 40 },
  { code: "KW", name_ar: "الكويت", name_en: "Kuwait", currency_code: "KWD", dialing_code: "+965", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "gcc", kyc_jurisdiction: "KW", sort_order: 50 },
  { code: "BH", name_ar: "البحرين", name_en: "Bahrain", currency_code: "BHD", dialing_code: "+973", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "gcc", kyc_jurisdiction: "BH", sort_order: 60 },
  { code: "OM", name_ar: "عُمان", name_en: "Oman", currency_code: "OMR", dialing_code: "+968", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "gcc", kyc_jurisdiction: "OM", sort_order: 70 },
  { code: "US", name_ar: "الولايات المتحدة", name_en: "United States", currency_code: "USD", dialing_code: "+1", enabled: true, kyc_required: true, risk_level: "medium", sanctions_blocked: false, payment_region: "americas", kyc_jurisdiction: "US", sort_order: 80 },
  { code: "GB", name_ar: "المملكة المتحدة", name_en: "United Kingdom", currency_code: "GBP", dialing_code: "+44", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "europe", kyc_jurisdiction: "GB", sort_order: 90 },
  { code: "EU", name_ar: "دول الاتحاد الأوروبي", name_en: "European Union", currency_code: "EUR", dialing_code: null, enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "europe", kyc_jurisdiction: "EU", sort_order: 100 },
  { code: "OTHER", name_ar: "باقي دول العالم", name_en: "Rest of world", currency_code: "USD", dialing_code: null, enabled: true, kyc_required: true, risk_level: "medium", sanctions_blocked: false, payment_region: "global", kyc_jurisdiction: "OTHER", sort_order: 900 },
];

export function getCountrySeed(code: string): CountryRecord | undefined {
  return COUNTRY_SEED.find((c) => c.code === code.toUpperCase());
}

export function isCountryOrderable(country: Pick<CountryRecord, "enabled" | "sanctions_blocked" | "risk_level">): boolean {
  return country.enabled && !country.sanctions_blocked && country.risk_level !== "blocked";
}

export function countryDisplayName(country: CountryRecord, locale: "ar" | "en"): string {
  return locale === "ar" ? country.name_ar : country.name_en;
}
