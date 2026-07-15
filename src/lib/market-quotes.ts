const DEFAULT_USD_AED = 3.6725;
const DEFAULT_USD_IQD = 1310;

export function getUsdToIqdRate() {
  const raw = Number(process.env.USD_TO_IQD_RATE || DEFAULT_USD_IQD);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_USD_IQD;
}

export function getUsdToAedRate() {
  const raw = Number(process.env.USD_TO_AED_RATE || DEFAULT_USD_AED);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_USD_AED;
}

export function normalizeQuote(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function deriveIqd(usd: number, providerIqd: number | null, fx = getUsdToIqdRate()) {
  if (providerIqd && providerIqd > 0) return { iqd: providerIqd, derived: false };
  return { iqd: usd * fx, derived: true };
}
