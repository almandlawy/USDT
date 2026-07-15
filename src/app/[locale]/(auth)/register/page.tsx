import Link from "next/link";
import { UserRound, Mail, LockKeyhole, ArrowLeft, ArrowRight } from "lucide-react";
import { registerAction } from "../actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";

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

  return (
    <div className="authCard">
      <div className="authHeading">
        <span>{ar ? "إنشاء حساب آمن" : "Create secure account"}</span>
        <h2>{ar ? "إنشاء حساب" : "Create account"}</h2>
        <p>{ar ? "أدخل البريد وكلمة المرور وادخل مباشرة عندما تكون الجلسة جاهزة." : "Enter your email and password and continue when the session is ready."}</p>
      </div>
      {error && <div className="formAlert">{authErrorMessage(error, locale)}</div>}
      <form action={registerAction} className="stackForm">
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{ar ? "الاسم" : "Name"}</span>
          <div className="fieldWithIcon">
            <UserRound />
            <input name="displayName" autoComplete="name" required minLength={2} />
          </div>
        </label>
        <label>
          <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
          <div className="fieldWithIcon">
            <Mail />
            <input name="identifier" type="email" autoComplete="email" placeholder="name@example.com" required />
          </div>
        </label>
        <label>
          <span>{ar ? "كلمة المرور" : "Password"}</span>
          <div className="fieldWithIcon">
            <LockKeyhole />
            <input name="password" type="password" autoComplete="new-password" minLength={12} required />
          </div>
          <small>{ar ? "12 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز." : "At least 12 characters with upper, lower, number and symbol."}</small>
        </label>
        <label className="checkLine legalCheck">
          <input name="termsAccepted" type="checkbox" required />
          <span>
            {ar ? (
              <>
                أوافق على <Link href={`/${locale}/legal/terms`}>الشروط</Link> و
                <Link href={`/${locale}/legal/privacy`}>الخصوصية</Link> و
                <Link href={`/${locale}/legal/risk`}>إفصاح المخاطر</Link>، الإصدار 2026-07-15.
              </>
            ) : (
              <>
                I accept the <Link href={`/${locale}/legal/terms`}>terms</Link>,{" "}
                <Link href={`/${locale}/legal/privacy`}>privacy policy</Link> and{" "}
                <Link href={`/${locale}/legal/risk`}>risk disclosure</Link>, version 2026-07-15.
              </>
            )}
          </span>
        </label>
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
