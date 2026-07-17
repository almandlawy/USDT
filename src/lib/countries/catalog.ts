/**
 * Primary country selector — short list only.
 * Full catalog remains in DB for allowlist/blocklist admin.
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

/** Full seed for admin / DB fallback */
export const COUNTRY_SEED: CountryRecord[] = [
  { code: "IQ", name_ar: "العراق", name_en: "Iraq", currency_code: "IQD", dialing_code: "+964", enabled: true, kyc_required: true, risk_level: "medium", sanctions_blocked: false, payment_region: "iraq", kyc_jurisdiction: "IQ", sort_order: 10 },
  { code: "AE", name_ar: "الإمارات العربية المتحدة", name_en: "United Arab Emirates", currency_code: "AED", dialing_code: "+971", enabled: true, kyc_required: true, risk_level: "low", sanctions_blocked: false, payment_region: "uae", kyc_jurisdiction: "AE", sort_order: 20 },
  { code: "OTHER", name_ar: "باقي دول العالم", name_en: "Rest of world", currency_code: "USD", dialing_code: null, enabled: true, kyc_required: true, risk_level: "medium", sanctions_blocked: false, payment_region: "global", kyc_jurisdiction: "OTHER", sort_order: 900 },
];

/** Customer-facing primary chooser (no long list). */
export const PRIMARY_COUNTRY_CODES = ["IQ", "AE", "OTHER"] as const;

export function primaryCountries(seed: CountryRecord[] = COUNTRY_SEED): CountryRecord[] {
  return PRIMARY_COUNTRY_CODES.map((code) => seed.find((c) => c.code === code)).filter(Boolean) as CountryRecord[];
}

export function getCountrySeed(code: string): CountryRecord | undefined {
  return COUNTRY_SEED.find((c) => c.code === code.toUpperCase());
}

export function isCountryOrderable(country: Pick<CountryRecord, "enabled" | "sanctions_blocked" | "risk_level">): boolean {
  return country.enabled && !country.sanctions_blocked && country.risk_level !== "blocked";
}

export function countryDisplayName(country: CountryRecord, locale: "ar" | "en"): string {
  return locale === "ar" ? country.name_ar : country.name_en;
}

export function primaryCurrencyForCountry(code: string): string {
  if (code === "IQ") return "IQD";
  if (code === "AE") return "AED";
  return "USD";
}
