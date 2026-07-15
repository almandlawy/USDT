export const SITE_NAME = "Gulf Gate";
export const PRODUCTION_ORIGIN = "https://gulf-gate-platform.vercel.app";

export function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && configured !== "http://localhost:3000") {
    return configured.replace(/\/$/, "");
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return `https://${vercelProduction.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : PRODUCTION_ORIGIN;
}

export const seoCopy = {
  ar: {
    title: "Gulf Gate | إدارة طلبات USDT والأصول الرقمية في العراق",
    shortTitle: "إدارة طلبات USDT والأصول الرقمية",
    description:
      "منصة عراقية ثنائية اللغة لإدارة طلبات شراء وبيع USDT، والتحقق KYC، وإثباتات الدفع ضمن بيئة آمنة في وضع ما قبل الإطلاق.",
    legalDescription: "الإفصاحات القانونية والتنظيمية لمنصة Gulf Gate في وضع ما قبل الإطلاق.",
  },
  en: {
    title: "Gulf Gate | Managed USDT & Digital Asset Requests in Iraq",
    shortTitle: "Managed USDT and digital asset requests",
    description:
      "A bilingual Iraqi platform for managing USDT buy and sell requests, KYC, and payment evidence securely in pre-launch mode.",
    legalDescription: "Legal and regulatory disclosures for the Gulf Gate pre-launch platform.",
  },
} as const;

export type SiteLocale = keyof typeof seoCopy;

