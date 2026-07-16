import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site";

const LEGAL_VERSION_DATE = new Date("2026-07-16T00:00:00.000Z");
const legalDocs = ["terms", "privacy", "risk", "cookies", "retention", "aup", "complaints", "data-deletion"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteOrigin();
  const entries = [
    { path: "/ar", priority: 1 },
    { path: "/en", priority: 1 },
    { path: "/ar/security-compliance", priority: 0.8 },
    { path: "/en/security-compliance", priority: 0.8 },
    ...legalDocs.flatMap((doc) => [
      { path: `/ar/legal/${doc}`, priority: 0.5 },
      { path: `/en/legal/${doc}`, priority: 0.5 },
    ]),
  ] as const;

  return entries.map(({ path, priority }) => {
    const isHome = path === "/ar" || path === "/en";
    const suffix = path.replace(/^\/(ar|en)/, "") || "";
    return {
      url: `${base}${path}`,
      lastModified: LEGAL_VERSION_DATE,
      changeFrequency: isHome ? ("daily" as const) : ("monthly" as const),
      priority,
      alternates: {
        languages: {
          "ar-IQ": `${base}/ar${suffix}`,
          "en-IQ": `${base}/en${suffix}`,
          "x-default": `${base}/ar${suffix}`,
        },
      },
    };
  });
}
