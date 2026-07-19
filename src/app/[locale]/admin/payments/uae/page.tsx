import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleAlert, CreditCard, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { canAccessAdminSection } from "@/lib/admin-permissions";
import { requireStaff } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { canUseStripeCheckout } from "@/lib/payments/flags";
import { saveUaePaymentAccountAction } from "../../uae-actions";

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
  instructions_ar: string | null;
  instructions_en: string | null;
  account_payload_encrypted: string | null;
};

function errorMessage(code: string | undefined, ar: boolean) {
  switch (code) {
    case "configuration":
      return ar ? "إعداد Supabase غير مكتمل." : "Supabase configuration is incomplete.";
    case "missing_payment_details":
      return ar ? "لا يمكن تفعيل المسار اليدوي قبل إضافة بيانات دفع مشفرة أو QR." : "Add encrypted payment details or a QR asset before enabling a manual route.";
    case "stripe_not_ready":
      return ar ? "Stripe غير جاهز: يجب تفعيل STRIPE_ENABLED وSTRIPE_CRYPTO_APPROVED وREAL_PAYMENTS_ENABLED وإضافة مفاتيح الإنتاج والـWebhook." : "Stripe is not ready: enable all approval gates and configure production and webhook secrets.";
    case "unsupported_method":
      return ar ? "طريقة الدفع غير مدعومة في لوحة الإمارات." : "This payment method is not supported by the UAE admin page.";
    case "account_not_found":
      return ar ? "حساب الدفع غير موجود." : "Payment account was not found.";
    case "save_failed":
      return ar ? "تعذر حفظ حساب الدفع. راجع البيانات والحدود." : "Could not save the payment account. Review its details and limits.";
    default:
      return code || (ar ? "حدث خطأ." : "Something went wrong.");
  }
}

export default async function UaePaymentsAdminPage({
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
        "id,payment_method_code,display_name_ar,display_name_en,integration_mode,enabled,currency_code,min_amount,max_amount,sort_order,instructions_ar,instructions_en,account_payload_encrypted",
      )
      .eq("country_code", "AE")
      .order("sort_order");
    if (error) loadError = error.message;
    rows = (data || []) as AccountRow[];
  }

  const stripeReady = canUseStripeCheckout();

  return (
    <>
      <div className="pageHeading">
        <div>
          <span>{ar ? "الإدارة" : "Admin"} / payments / uae</span>
          <h1>{ar ? "حسابات الدفع الإماراتية" : "UAE payment accounts"}</h1>
          <p>
            {ar
              ? "Stripe يعمل عبر API بعد اكتمال جميع البوابات. e& money وdu Pay والتحويل البنكي تبقى مسارات يدوية مع إثبات دفع."
              : "Stripe uses its API only after every gate is complete. e& money, du Pay, and bank transfer remain manual proof routes."}
          </p>
          <div className="heroActions">
            <Link className="secondaryButton small" href={`/${locale}/admin/payments/iraq`}>
              {ar ? "إدارة مدفوعات العراق" : "Manage Iraq payments"}
            </Link>
          </div>
        </div>
        <span className="statusBadge" data-tone={stripeReady ? "success" : "warning"}>
          {stripeReady ? <ShieldCheck size={14} /> : <LockKeyhole size={14} />}
          Stripe {stripeReady ? "READY" : "LOCKED"}
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
            <span>AE · AED</span>
            <h2>{ar ? "مسارات الإمارات" : "UAE routes"}</h2>
          </div>
          <CreditCard />
        </div>
        <p className="methodHint">
          {ar
            ? "مفاتيح Stripe تُحفظ في Vercel فقط. أرقام المحافظ والحسابات اليدوية تُحفظ مشفرة هنا ولا تظهر قبل إنشاء طلب صالح."
            : "Stripe secrets belong in Vercel only. Manual wallet and bank details are encrypted here and stay hidden until a valid order exists."}
        </p>

        {rows.length === 0 ? (
          <div className="emptyState">
            <ShieldCheck />
            <h3>{ar ? "لا توجد صفوف بعد — طبّق migrations 015 و016" : "No rows yet — apply migrations 015 and 016"}</h3>
          </div>
        ) : (
          <div className="settingsList">
            {rows.map((row) => {
              const isStripe = row.payment_method_code === "stripe_card";
              return (
                <article key={row.id} className="settingsRow" style={{ display: "block" }}>
                  <form action={saveUaePaymentAccountAction} className="formGrid">
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
                      <input value={isStripe ? "api" : "manual"} readOnly />
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
                      <input type="checkbox" name="enabled" defaultChecked={row.enabled} disabled={isStripe && !stripeReady} />
                      {ar ? "مفعّلة" : "Enabled"}
                    </label>
                    <label className="fullField">
                      <span>{ar ? "تعليمات عربية (بعد الطلب فقط)" : "Arabic instructions (after order only)"}</span>
                      <textarea name="instructionsAr" rows={3} defaultValue={row.instructions_ar || ""} />
                    </label>
                    <label className="fullField">
                      <span>{ar ? "تعليمات إنجليزية" : "English instructions"}</span>
                      <textarea name="instructionsEn" rows={3} defaultValue={row.instructions_en || ""} />
                    </label>
                    {!isStripe ? (
                      <label className="fullField">
                        <span>
                          {ar
                            ? "بيانات الدفع اليدوي (تُشفّر — هاتف/IBAN/حساب). مطلوبة قبل التفعيل."
                            : "Manual payment details (encrypted — phone/IBAN/account). Required before enabling."}
                        </span>
                        <textarea
                          name="accountPayload"
                          rows={2}
                          placeholder={row.account_payload_encrypted ? "(encrypted — leave blank to keep)" : ""}
                        />
                      </label>
                    ) : (
                      <input type="hidden" name="accountPayload" value="" />
                    )}
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
