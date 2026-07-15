import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireStaff } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const staff = await requireStaff(locale, [...STAFF_ROLES]);
  return <DashboardShell locale={locale} dict={getDictionary(locale)} userName={staff.displayName} admin>{children}</DashboardShell>;
}
