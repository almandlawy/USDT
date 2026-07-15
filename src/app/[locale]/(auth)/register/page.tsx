import Link from "next/link";
import { UserRound, Mail, LockKeyhole, ArrowLeft, ArrowRight } from "lucide-react";
import { registerAction } from "../actions";
import { isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";

function registerErrorMessage(code: string | undefined, ar: boolean) {
  switch (code) {
    case "configuration":
      return ar
        ? "Supabase غير مربوط في بيئة Vercel. أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ثم أعد النشر."
        : "Supabase is not configured on Vercel. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then redeploy.";
    case "invalid_form":
      return ar
        ? "البيانات غير مكتملة أو كلمة المرور ضعيفة. يلزم 12 حرفاً مع حرف كبير وصغير ورقم ورمز، مع الموافقة على الشروط."
        : "Incomplete details or weak password. Use 12+ characters with upper, lower, number and symbol, and accept the terms.";
    case "registration_failed":
      return ar
        ? "تعذر إنشاء الحساب من Supabase. تحقق من تفعيل Email Auth وقائمة Redirect URLs، أو أن البريد غير مستخدم مسبقاً."
        : "Supabase could not create the account. Check Email Auth, Redirect URLs, or whether the email is already registered.";
    case "rate_limited":
      return ar ? "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." : "Too many attempts. Wait a moment and try again.";
    case "security_check_failed":
      return ar ? "فشل التحقق الأمني للطلب. حدّث الصفحة وأعد المحاولة من نفس الموقع." : "Security check failed. Refresh and retry from the same site.";
    default:
      return ar ? "تعذر إنشاء الحساب. راجع البيانات أو إعدادات Supabase." : "Could not create the account. Review your details or Supabase settings.";
  }
}

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
        <span>CREATE SECURE ACCOUNT</span>
        <h2>{ar ? "إنشاء حساب" : "Create account"}</h2>
        <p>{ar ? "سجّل بالبريد واضغط رابط التأكيد فقط — بدون رمز." : "Register by email and select the confirmation link — no code required."}</p>
      </div>
      {error && <div className="formAlert">{registerErrorMessage(error, ar)}</div>}
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
          <small>{ar ? "مثال قوي: GulfGate-2026!" : "Strong example: GulfGate-2026!"}</small>
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
