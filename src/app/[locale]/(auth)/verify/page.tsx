import { ShieldCheck } from "lucide-react";
import { resendOtpAction } from "../actions";
import { isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ identifier?: string; error?: string;resent?:string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const ar = locale === "ar"; const query = await searchParams;
  const identifier=query.identifier||"";
  return <div className="authCard compactAuth"><div className="otpIcon"><ShieldCheck/></div><div className="authHeading centered"><span>EMAIL VERIFICATION</span><h2>{ar?"تحقق من بريدك":"Check your email"}</h2><p>{ar?"أرسلنا رابط تأكيد إلى بريدك. افتح أحدث رسالة واضغط رابط تأكيد الحساب — لا تحتاج إلى إدخال أي رمز.":"We sent a confirmation link. Open the newest email and select the confirmation link — no code is required."}</p></div>{query.resent&&<div className="formSuccess">{ar?"أُعيد إرسال رابط التأكيد.":"The confirmation link was resent."}</div>}{query.error&&<div className="formAlert">{ar?"تعذر التحقق أو انتهت صلاحية الرسالة.":"Verification failed or the message expired."}</div>}<form action={resendOtpAction} className="resendForm"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="identifier" value={identifier}/><button className="textButton" type="submit">{ar?"إعادة إرسال رابط التأكيد":"Resend confirmation link"}</button></form></div>;
}
