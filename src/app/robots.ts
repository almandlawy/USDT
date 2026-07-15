import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_APP_URL||"https://gulf-gate-platform.vercel.app";return {rules:[{userAgent:"*",allow:["/ar","/en","/ar/legal/","/en/legal/"],disallow:["/ar/dashboard/","/en/dashboard/","/ar/admin/","/en/admin/","/api/"]}],sitemap:`${base}/sitemap.xml`}}
