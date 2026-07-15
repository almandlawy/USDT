import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Locale, StaffRole } from "@/lib/constants";

const demoUser = { id: "00000000-0000-4000-8000-000000000001", email: "customer@example.test", displayName: "Omar Al-Karim" };

async function loginRedirect(locale: Locale, error?: string): Promise<never> {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || `/${locale}/dashboard`;
  const safeNext = pathname.startsWith(`/${locale}/`) ? pathname : `/${locale}/dashboard`;
  const params = new URLSearchParams({ next: safeNext });
  if (error) params.set("error", error);
  redirect(`/${locale}/login?${params.toString()}`);
}

export async function requireUser(locale: Locale) {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true") return demoUser;
    await loginRedirect(locale, "configuration");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) await loginRedirect(locale);
  const user = data.user!;
  return { id: user.id, email: user.email || user.phone || "", displayName: String(user.user_metadata?.display_name || "Gulf Gate user") };
}

export async function requireStaff(locale: Locale, allowed: StaffRole[]) {
  const user = await requireUser(locale);
  if (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true" && !isSupabaseConfigured()) {
    return { ...user, roles: ["super_admin"] as StaffRole[], aal: "aal2" };
  }
  const supabase = await createClient();
  const [{ data: roles }, { data: assurance }] = await Promise.all([
    supabase.from("staff_roles").select("role").eq("user_id", user.id),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const userRoles = (roles || []).map((item) => item.role as StaffRole);
  if (!userRoles.some((role) => allowed.includes(role))) redirect(`/${locale}/dashboard?error=forbidden`);
  if (assurance?.currentLevel !== "aal2") redirect(`/${locale}/dashboard/security?error=mfa_required`);
  return { ...user, roles: userRoles, aal: assurance.currentLevel };
}
