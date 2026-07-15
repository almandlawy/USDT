import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteOrigin();
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/ar", "/en", "/ar/legal/", "/en/legal/", "/ar/security-compliance", "/en/security-compliance"],
      disallow: [
        "/api/",
        "/ar/admin",
        "/en/admin",
        "/ar/dashboard",
        "/en/dashboard",
        "/ar/login",
        "/en/login",
        "/ar/register",
        "/en/register",
        "/ar/reset-password",
        "/en/reset-password",
        "/ar/verify",
        "/en/verify",
        "/auth/",
      ],
    }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
