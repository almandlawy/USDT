import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireUser } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export const metadata:Metadata={robots:{index:false,follow:false,nocache:true}};

export default async function ClientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const user = await requireUser(locale);
  return <DashboardShell locale={locale} dict={getDictionary(locale)} userName={user.displayName}>{children}</DashboardShell>;
}
