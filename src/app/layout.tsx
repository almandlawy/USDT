import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getSiteOrigin, SITE_NAME } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  applicationName: SITE_NAME,
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "A bilingual pre-launch platform for managed digital-asset requests.",
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" },
  category: "finance",
};

export const viewport:Viewport={
  width:"device-width",
  initialScale:1,
  colorScheme:"dark",
  themeColor:"#06111f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale=(await headers()).get("x-locale")==="en"?"en":"ar";
  return (
    <html lang={locale} dir={locale==="ar"?"rtl":"ltr"} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
