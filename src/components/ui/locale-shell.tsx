"use client";
import { useEffect } from "react";
import type { Locale } from "@/lib/constants";

export function LocaleShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"; }, [locale]);
  return <div dir={locale === "ar" ? "rtl" : "ltr"} data-locale={locale}>{children}</div>;
}
