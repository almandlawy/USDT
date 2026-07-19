import Link from "next/link";
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

function errorMessage(code: string | undefined, ar: boolean) {
  switch (code) {
    case "configuration":
      return ar ? "إعداد Supabase غير مكتمل." : "Supabase configuration is incomplete.";
    case "missing_payment_details":
      return ar ? "لا يمكن تفعيل الوسيلة قبل إضافة بيانات دفع مشفرة أو QR." : "Add encrypted payment details or a QR asset before enabling this method.";
    case "api_not_implemented":
      return ar ? "وضع API غير منفذ لهذه الوسيلة. FIB وSuperQi والتحويل البنكي تعمل يدوياً حالياً." : "API mode is not implemented for this method. FIB, SuperQi, and bank transfer are manual routes.";
    case "zaincash_not_ready":
      return ar ? "ربط زين كاش غير جاهز: فعّل بوابة الدفع الحقيقي وأضف بيانات الإنتاج والـWebhook أولاً." : "Zain Cash is not ready: enable real payments and configure production credentials and webhook first.";
    case "account_not_found":
      return ar ? "حساب الدفع غير موجود." : "Payment account was not found.";
    case "save_failed":
      return ar ? "تعذر حفظ حساب الدفع. راجع الإعدادات والحدود." : "Could not save the payment account. Review its configuration and limits.";
    default:
      return code || (ar ? "حدث خطأ." : "Something went wrong.");
  }
}

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
              ? "FIB وSuperQi والتحويل البنكي تعمل يدوياً. زين كاش يمكن أن يكون يدوياً أو API بعد اكتمال بيانات الإنتاج."
              : "FIB, SuperQi, and bank transfer are manual routes. Zain Cash can be manual or API after production setup is complete."}
          </p>
          <div className="heroActions">
            <Link className="secondaryButton small" href={`/${locale}/admin/payments/uae`}>
              {ar ? "إدارة مدفوعات الإمارات" : "Manage UAE payments"}
            </Link>
          </div>
        </div>
        <span className="statusBadge" data-tone="warning">
          <LockKeyhole size={14} /> Super Admin / Finance
        </span>
      </div>

      {(query.error || loadError) && (
        <div className="formAlert">
          <CircleAlert />
          {errorMessage(query.error || loadError, ar)}
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
          <strong>Verified legal address (draft):</strong> {draftAddress}
        </p>
        <p>
          {ar ? "حالة التحقق:" : "Verification:"} <strong>{verified ? "verified" : "not verified"}</strong>
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
            <h3>{ar ? "لا توجد صفوف بعد — طبّق migrations 015 و016" : "No rows yet — apply migrations 015 and 016"}</h3>
          </div>
        ) : (
          <div className="settingsList">
            {rows.map((row) => {
              const supportsApi = row.payment_method_code === "zain_cash";
              return (
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
                      {supportsApi ? (
                        <select name="integrationMode" defaultValue={row.integration_mode === "api" ? "api" : "manual"}>
                          <option value="manual">manual</option>
                          <option value="api">api — official Zain Cash adapter</option>
                        </select>
                      ) : (
                        <>
                          <input type="hidden" name="integrationMode" value="manual" />
                          <input value="manual" readOnly />
                        </>
                      )}
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
                      <span>{ar ? "الترتيب" : "Sort"}</span>
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
                          ? "بيانات الحساب (تُشفَّر — رقم/IBAN/هاتف). مطلوبة قبل تفعيل أي مسار يدوي."
                          : "Account payload (encrypted — number/IBAN/phone). Required before enabling a manual route."}
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
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
