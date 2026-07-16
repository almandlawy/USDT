import Link from "next/link";
import { Mail, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { resetPasswordAction, updatePasswordAction } from "../actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { isLocale } from "@/lib/i18n/dictionaries";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { PasswordStrengthField } from "@/components/auth/password-strength";
import { turnstileSiteKey } from "@/lib/security/turnstile-public";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; sent?: string; mode?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const query = await searchParams;
  const updateMode = query.mode === "update";
  const siteKey = turnstileSiteKey();

  return (
    <div className="authCard">
      <div className="authHeading">
        <span>{ar ? "استعادة الحساب" : "Account recovery"}</span>
        <h2>{updateMode ? (ar ? "كلمة مرور جديدة" : "New password") : (ar ? "استعادة كلمة المرور" : "Reset password")}</h2>
        <p>
          {updateMode
            ? (ar ? "اختر كلمة مرور قوية ثم سجّل الدخول من جديد." : "Choose a strong password, then sign in again.")
            : (ar
              ? "إذا كان البريد مسجلاً فستصلك رسالة استعادة خلال دقائق."
              : "If the email is registered, a recovery message will arrive shortly.")}
        </p>
      </div>
      {query.sent ? (
        <div className="formSuccess" role="status">
          {ar
            ? "إذا كان البريد مسجلاً فستصلك رسالة استعادة خلال دقائق."
            : "If the email is registered, a recovery message will arrive shortly."}
        </div>
      ) : null}
      {query.error ? <div className="formAlert" role="alert">{authErrorMessage(query.error, locale)}</div> : null}

      {updateMode ? (
        <form action={updatePasswordAction} className="stackForm">
          <input type="hidden" name="locale" value={locale} />
          <PasswordStrengthField locale={locale} />
          <label>
            <span>{ar ? "تأكيد كلمة المرور" : "Confirm password"}</span>
            <div className="fieldWithIcon">
              <LockKeyhole />
              <input name="confirmation" type="password" autoComplete="new-password" dir="ltr" minLength={12} required />
            </div>
          </label>
          <button className="primaryButton wide" type="submit">{ar ? "حفظ كلمة المرور" : "Save password"}</button>
        </form>
      ) : (
        <form action={resetPasswordAction} className="stackForm">
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
            <div className="fieldWithIcon">
              <Mail />
              <input name="email" type="email" autoComplete="email" dir="ltr" required />
            </div>
          </label>
          <TurnstileField siteKey={siteKey} locale={locale} />
          <button className="primaryButton wide" type="submit">{ar ? "إرسال رابط الاستعادة" : "Send recovery link"}</button>
        </form>
      )}
      <p className="authFooter">
        <Link href={`/${locale}/login`}>{ar ? "العودة لتسجيل الدخول" : "Back to sign in"}</Link>
      </p>
    </div>
  );
}
