import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "Gulf Gate", template: "%s | Gulf Gate" },
  description: "A bilingual pre-launch platform for compliant digital-asset request management.",
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
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
