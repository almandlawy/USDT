import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/dictionaries";

/** OTP flow removed — keep route as a safe redirect for old bookmarks. */
export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/login`);
  return (
    <div className="authCard">
      <p><Link href={`/${locale}/login`}>{locale === "ar" ? "تسجيل الدخول" : "Sign in"}</Link></p>
    </div>
  );
}
