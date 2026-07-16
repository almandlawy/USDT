import Link from "next/link";
import { UserRound, Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { registerAction } from "../actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { PasswordStrengthField } from "@/components/auth/password-strength";
import { turnstileSiteKey } from "@/lib/security/turnstile-public";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const { error } = await searchParams;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const siteKey = turnstileSiteKey();
  const already = error === "email_already_registered";

  return (
    <div className="authCard">
      <div className="authHeading">
        <span>{ar ? "إنشاء حساب آمن" : "Create secure account"}</span>
        <h2>{ar ? "إنشاء حساب" : "Create account"}</h2>
        <p>{ar ? "التسجيل بالبريد وكلمة المرور فقط. لا معاملات مالية حقيقية في مرحلة التجهيز." : "Email and password only. No real financial transactions in pre-launch."}</p>
      </div>
      {error ? (
        <div className="formAlert" role="alert">
          {authErrorMessage(error, locale)}
          {already ? (
            <p className="authInlineLinks">
              <Link href={`/${locale}/login`}>{ar ? "تسجيل الدخول" : "Sign in"}</Link>
              {" · "}
              <Link href={`/${locale}/reset-password`}>{ar ? "استعادة كلمة المرور" : "Reset password"}</Link>
            </p>
          ) : null}
        </div>
      ) : null}
      <form action={registerAction} className="stackForm">
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{ar ? "الاسم الكامل" : "Full name"}</span>
          <div className="fieldWithIcon">
            <UserRound />
            <input name="displayName" autoComplete="name" required minLength={2} />
          </div>
        </label>
        <label>
          <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
          <div className="fieldWithIcon">
            <Mail />
            <input name="email" type="email" autoComplete="email" dir="ltr" placeholder="name@example.com" required />
          </div>
        </label>
        <label>
          <span>{ar ? "نوع الحساب" : "Account type"}</span>
          <select name="accountType" defaultValue="individual" required>
            <option value="individual">{ar ? "فرد" : "Individual"}</option>
            <option value="business">{ar ? "شركة" : "Business"}</option>
          </select>
        </label>
        <PasswordStrengthField locale={locale} confirmName="passwordConfirm" />
        <label className="checkLine legalCheck">
          <input name="termsAccepted" type="checkbox" required />
          <span>
            {ar ? <>أوافق على <Link href={`/${locale}/legal/terms`}>شروط الاستخدام</Link>.</> : <>I accept the <Link href={`/${locale}/legal/terms`}>terms of use</Link>.</>}
          </span>
        </label>
        <label className="checkLine legalCheck">
          <input name="privacyAccepted" type="checkbox" required />
          <span>
            {ar ? <>أوافق على <Link href={`/${locale}/legal/privacy`}>سياسة الخصوصية</Link>.</> : <>I accept the <Link href={`/${locale}/legal/privacy`}>privacy policy</Link>.</>}
          </span>
        </label>
        <label className="checkLine legalCheck">
          <input name="riskAccepted" type="checkbox" required />
          <span>
            {ar ? <>اطلعت على <Link href={`/${locale}/legal/risk`}>إفصاح المخاطر</Link>.</> : <>I reviewed the <Link href={`/${locale}/legal/risk`}>risk disclosure</Link>.</>}
          </span>
        </label>
        <TurnstileField siteKey={siteKey} locale={locale} />
        <button className="primaryButton wide" type="submit">
          {ar ? "إنشاء الحساب" : "Create account"}
          <Arrow size={18} />
        </button>
      </form>
      <p className="authFooter">
        {ar ? "لديك حساب؟" : "Already registered?"} <Link href={`/${locale}/login`}>{ar ? "تسجيل الدخول" : "Sign in"}</Link>
      </p>
    </div>
  );
}
