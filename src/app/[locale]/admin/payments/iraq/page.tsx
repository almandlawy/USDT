import { notFound, redirect } from "next/navigation";
import { CircleAlert, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { canAccessAdminSection } from "@/lib/admin-permissions";
import { requireStaff } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { companyAdminDraftAddress, isCompanyLegalDetailsVerified } from "@/lib/company/legal";
import { saveIraqPaymentAccountAction } from "../../iraq-actions";

export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  payment_method_code: string;
  display_name_ar: string;
  display_name_en: string;
  integration_mode: string;
  enabled: boolean;
  currency_code: string;
  min_amount: number | null;
  max_amount: number | null;
  sort_order: number;
  valid_from: string | null;
  valid_to: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
  account_payload_encrypted: string | null;
};

export default async function IraqPaymentsAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const ar = locale === "ar";
  const staff = await requireStaff(locale, ["super_admin", "finance"]);
  if (!canAccessAdminSection(staff.roles, "payment-methods") && !staff.roles.includes("super_admin")) {
    redirect(`/${locale}/admin?error=forbidden`);
  }

  const query = await searchParams;
  let rows: AccountRow[] = [];
  let loadError: string | undefined;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("country_payment_accounts")
      .select(
        "id,payment_method_code,display_name_ar,display_name_en,integration_mode,enabled,currency_code,min_amount,max_amount,sort_order,valid_from,valid_to,instructions_ar,instructions_en,account_payload_encrypted",
      )
      .eq("country_code", "IQ")
      .order("sort_order");
    if (error) loadError = error.message;
    rows = (data || []) as AccountRow[];
  }

  const draftAddress = companyAdminDraftAddress();
  const verified = isCompanyLegalDetailsVerified();

  return (
    <>
      <div className="pageHeading">
        <div>
          <span>{ar ? "الإدارة" : "Admin"} / payments / iraq</span>
          <h1>{ar ? "حسابات الدفع العراقية" : "Iraq payment accounts"}</h1>
          <p>
            {ar
              ? "FIB وSuperQi وزين كاش والتحويل البنكي العراقي. التفاصيل مشفرة ولا تُعرض عبر Public API."
              : "FIB, SuperQi, Zain Cash, and Iraqi bank transfer. Details are encrypted and never exposed via public API."}
          </p>
        </div>
        <span className="statusBadge" data-tone="warning">
          <LockKeyhole size={14} /> Super Admin / Finance
        </span>
      </div>

      {(query.error || loadError) && (
        <div className="formAlert">
          <CircleAlert />
          {query.error || loadError}
        </div>
      )}
      {query.saved && (
        <div className="formSuccess">
          <ShieldCheck />
          {ar ? "تم الحفظ وسُجل في التدقيق." : "Saved and audit logged."}
        </div>
      )}

      <section className="panel">
        <div className="panelHeading">
          <div>
            <span>ADMIN ONLY</span>
            <h2>{ar ? "العنوان القانوني (مسودة)" : "Legal address (draft)"}</h2>
          </div>
        </div>
        <p className="methodHint">
          {ar
            ? "لا يُنشر في Footer أو الصفحات القانونية إلا بعد COMPANY_LEGAL_DETAILS_VERIFIED=true."
            : "Not published in footer/legal pages until COMPANY_LEGAL_DETAILS_VERIFIED=true."}
        </p>
        <p>
          <strong>{ar ? "Verified legal address (draft):" : "Verified legal address (draft):"}</strong> {draftAddress}
        </p>
        <p>
          {ar ? "حالة التحقق:" : "Verification:"}{" "}
          <strong>{verified ? "verified" : "not verified"}</strong>
        </p>
      </section>

      <section className="panel">
        <div className="panelHeading">
          <div>
            <span>IQ · IQD</span>
            <h2>{ar ? "الوسائل الأربع" : "Four methods"}</h2>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="emptyState">
            <ShieldCheck />
            <h3>{ar ? "لا توجد صفوف بعد — طبّق migration 015" : "No rows yet — apply migration 015"}</h3>
          </div>
        ) : (
          <div className="settingsList">
            {rows.map((row) => (
              <article key={row.id} className="settingsRow" style={{ display: "block" }}>
                <form action={saveIraqPaymentAccountAction} className="formGrid">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={row.id} />
                  <label>
                    <span>Code</span>
                    <input value={row.payment_method_code} readOnly />
                  </label>
                  <label>
                    <span>{ar ? "الاسم عربي" : "Name AR"}</span>
                    <input name="displayNameAr" defaultValue={row.display_name_ar} required />
                  </label>
                  <label>
                    <span>{ar ? "الاسم إنجليزي" : "Name EN"}</span>
                    <input name="displayNameEn" defaultValue={row.display_name_en} required />
                  </label>
                  <label>
                    <span>Mode</span>
                    <select name="integrationMode" defaultValue={row.integration_mode}>
                      <option value="manual">manual</option>
                      <option value="api">api</option>
                    </select>
                  </label>
                  <label>
                    <span>Min</span>
                    <input name="minAmount" type="number" defaultValue={row.min_amount ?? ""} />
                  </label>
                  <label>
                    <span>Max</span>
                    <input name="maxAmount" type="number" defaultValue={row.max_amount ?? ""} />
                  </label>
                  <label>
                    <span>Sort</span>
                    <input name="sortOrder" type="number" defaultValue={row.sort_order} />
                  </label>
                  <label className="checkLine">
                    <input type="checkbox" name="enabled" defaultChecked={row.enabled} />
                    {ar ? "مفعّلة" : "Enabled"}
                  </label>
                  <label className="fullField">
                    <span>{ar ? "تعليمات عربية (تظهر بعد الطلب فقط)" : "Arabic instructions (after order only)"}</span>
                    <textarea name="instructionsAr" rows={3} defaultValue={row.instructions_ar || ""} />
                  </label>
                  <label className="fullField">
                    <span>{ar ? "تعليمات إنجليزية" : "English instructions"}</span>
                    <textarea name="instructionsEn" rows={3} defaultValue={row.instructions_en || ""} />
                  </label>
                  <label className="fullField">
                    <span>
                      {ar
                        ? "بيانات الحساب (تُشفَّر — رقم/IBAN/هاتف). لا تُعرض للعامة."
                        : "Account payload (encrypted — number/IBAN/phone). Never public."}
                    </span>
                    <textarea
                      name="accountPayload"
                      rows={2}
                      placeholder={row.account_payload_encrypted ? "(encrypted — leave blank to keep)" : ""}
                    />
                  </label>
                  <button className="primaryButton" type="submit">
                    <Save />
                    {ar ? "حفظ" : "Save"}
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
