import Link from "next/link";
import { LockKeyhole, Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { loginAction } from "../actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { turnstileSiteKey } from "@/lib/security/turnstile-public";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string; password_updated?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const query = await searchParams;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const siteKey = turnstileSiteKey();

  return (
    <div className="authCard">
      <div className="authHeading">
        <span>{ar ? "الوصول إلى الحساب" : "Account access"}</span>
        <h2>{ar ? "تسجيل الدخول" : "Sign in"}</h2>
        <p>{ar ? "استخدم بريدك الإلكتروني وكلمة المرور." : "Use your email address and password."}</p>
        <ul className="authTrustList">
          <li>{ar ? "جلسات دخول آمنة" : "Secure sessions"}</li>
          <li>{ar ? "حماية متقدمة للحساب" : "Strong account protection"}</li>
          <li>{ar ? "مصادقة ثنائية اختيارية للعملاء" : "Optional customer 2FA"}</li>
        </ul>
      </div>
      {query.password_updated ? <div className="formSuccess" role="status">{ar ? "تم تحديث كلمة المرور. سجّل الدخول الآن." : "Password updated. Sign in now."}</div> : null}
      {query.error ? <div className="formAlert" role="alert">{authErrorMessage(query.error, locale)}</div> : null}
      <form action={loginAction} className="stackForm">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={query.next || ""} />
        <label>
          <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
          <div className="fieldWithIcon">
            <Mail />
            <input name="email" type="email" autoComplete="email" dir="ltr" placeholder="name@example.com" required />
          </div>
        </label>
        <label>
          <span>{ar ? "كلمة المرور" : "Password"}</span>
          <div className="fieldWithIcon">
            <LockKeyhole />
            <input name="password" type="password" autoComplete="current-password" dir="ltr" required />
          </div>
        </label>
        <TurnstileField siteKey={siteKey} locale={locale} />
        <div className="formMeta">
          <span>{ar ? "جلسة محمية بملفات ارتباط آمنة" : "Secure cookie session"}</span>
          <Link href={`/${locale}/reset-password`}>{ar ? "نسيت كلمة المرور؟" : "Forgot password?"}</Link>
        </div>
        <button className="primaryButton wide" type="submit">
          {ar ? "دخول آمن" : "Secure sign in"}
          <Arrow size={18} />
        </button>
      </form>
      <p className="authFooter">
        {ar ? "ليس لديك حساب؟" : "No account yet?"} <Link href={`/${locale}/register`}>{ar ? "إنشاء حساب" : "Create account"}</Link>
      </p>
    </div>
  );
}
