export const SITE_NAME = "Gulf Gate";
export const PRODUCTION_ORIGIN = "https://gulf-gate-platform.vercel.app";

function isLocalHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

function sanitizeOrigin(value: string | undefined | null) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim().includes("://") ? value.trim() : `https://${value.trim()}`);
    if (isLocalHostname(url.hostname)) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function getSiteOrigin() {
  const configured = sanitizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  const vercelProduction = sanitizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction) return vercelProduction;

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : PRODUCTION_ORIGIN;
}

export const seoCopy = {
  ar: {
    title: "Gulf Gate | إدارة طلبات USDT والأصول الرقمية في العراق",
    shortTitle: "إدارة طلبات USDT والأصول الرقمية",
    description:
      "منصة عراقية ثنائية اللغة لإدارة طلبات شراء وبيع USDT، والتحقق من الهوية، وإثباتات الدفع ضمن بيئة آمنة في وضع التجهيز قبل الإطلاق.",
    legalDescription: "الإفصاحات القانونية والتنظيمية لمنصة Gulf Gate في وضع ما قبل الإطلاق.",
  },
  en: {
    title: "Gulf Gate | Managed USDT & Digital Asset Requests in Iraq",
    shortTitle: "Managed USDT and digital asset requests",
    description:
      "A bilingual Iraqi platform for managing USDT buy and sell requests, identity verification, and payment evidence securely in pre-launch mode.",
    legalDescription: "Legal and regulatory disclosures for the Gulf Gate pre-launch platform.",
  },
} as const;

export type SiteLocale = keyof typeof seoCopy;
