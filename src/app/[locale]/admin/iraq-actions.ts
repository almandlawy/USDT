"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { assertSameOrigin } from "@/lib/security/request";
import { encryptAccountPayload } from "@/lib/payments/signed-instructions";
import type { Locale } from "@/lib/constants";

export async function saveIraqPaymentAccountAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  if (!isSupabaseConfigured()) redirect(`/${locale}/admin/payments/iraq?error=configuration`);
  await assertSameOrigin();
  await requireStaff(locale, ["super_admin", "finance"]);

  const id = String(formData.get("id") || "");
  if (!id) redirect(`/${locale}/admin/payments/iraq?error=missing_id`);

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("country_payment_accounts")
    .select("id,account_payload_encrypted,qr_storage_path")
    .eq("id", id)
    .eq("country_code", "IQ")
    .single();

  if (existingError || !existing) redirect(`/${locale}/admin/payments/iraq?error=account_not_found`);

  const payloadRaw = String(formData.get("accountPayload") || "").trim();
  const enabled = formData.get("enabled") === "on";
  const hasStoredPaymentDetails = Boolean(existing.account_payload_encrypted || existing.qr_storage_path);

  if (enabled && !payloadRaw && !hasStoredPaymentDetails) {
    redirect(`/${locale}/admin/payments/iraq?error=missing_payment_details`);
  }

  const update: Record<string, unknown> = {
    display_name_ar: String(formData.get("displayNameAr") || "").trim(),
    display_name_en: String(formData.get("displayNameEn") || "").trim(),
    integration_mode: String(formData.get("integrationMode") || "manual") === "api" ? "api" : "manual",
    enabled,
    min_amount: formData.get("minAmount") ? Number(formData.get("minAmount")) : null,
    max_amount: formData.get("maxAmount") ? Number(formData.get("maxAmount")) : null,
    sort_order: Number(formData.get("sortOrder") || 100),
    instructions_ar: String(formData.get("instructionsAr") || "").trim() || null,
    instructions_en: String(formData.get("instructionsEn") || "").trim() || null,
  };

  if (payloadRaw) {
    update.account_payload_encrypted = encryptAccountPayload(payloadRaw);
  }

  const { error } = await supabase
    .from("country_payment_accounts")
    .update(update)
    .eq("id", id)
    .eq("country_code", "IQ");

  if (error) redirect(`/${locale}/admin/payments/iraq?error=save_failed`);
  revalidatePath(`/${locale}/admin/payments/iraq`);
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/admin/payments/iraq?saved=true`);
}
