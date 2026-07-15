import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireUser } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function ClientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[dashboard-layout] unread notifications count failed", { userId: user.id, code: error.code });
  }

  return (
    <DashboardShell
      locale={locale}
      dict={getDictionary(locale)}
      userName={user.displayName}
      unreadCount={error ? 0 : count || 0}
    >
      {children}
    </DashboardShell>
  );
}
