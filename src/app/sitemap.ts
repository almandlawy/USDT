import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site";

const LEGAL_VERSION_DATE=new Date("2026-07-15T00:00:00.000Z");

export default function sitemap():MetadataRoute.Sitemap{
  const base=getSiteOrigin();
  return ["/ar","/en","/ar/legal/terms","/en/legal/terms","/ar/legal/privacy","/en/legal/privacy","/ar/legal/risk","/en/legal/risk"].map(path=>({
    url:`${base}${path}`,
    lastModified:LEGAL_VERSION_DATE,
    changeFrequency:path==="/ar"||path==="/en"?"daily" as const:"monthly" as const,
    priority:path==="/ar"||path==="/en"?1:.5,
    alternates:{languages:{ar:`${base}/ar${path.includes("/legal/")?path.slice(3):""}`,en:`${base}/en${path.includes("/legal/")?path.slice(3):""}`}},
  }));
}
