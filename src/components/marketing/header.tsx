import Link from "next/link";
import { Menu, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/constants";

export function MarketingHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const other = locale === "ar" ? "en" : "ar";
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const menuLabel=locale==="ar"?"فتح قائمة التنقل":"Open navigation menu";
  return <header className="marketingHeader"><div className="shell navInner"><Logo locale={locale}/><nav className="desktopNav" aria-label={locale==="ar"?"التنقل الرئيسي":"Primary navigation"}><a href="#platform">{dict.nav.platform}</a><a href="#security">{dict.nav.security}</a><a href="#compliance">{dict.nav.compliance}</a><a href="#faq">{dict.nav.faq}</a></nav><div className="navActions"><Link className="langButton" href={`/${other}`} hrefLang={other} aria-label={other==="en"?"English":"العربية"}>{other.toUpperCase()}</Link><Link className="textButton" href={`/${locale}/login`}>{dict.nav.login}</Link><Link className="primaryButton small" href={`/${locale}/register`}>{dict.nav.start}<Arrow size={17}/></Link><details className="mobileMenu"><summary aria-label={menuLabel}><Menu/></summary><nav aria-label={menuLabel}><a href="#platform">{dict.nav.platform}</a><a href="#security">{dict.nav.security}</a><a href="#compliance">{dict.nav.compliance}</a><a href="#faq">{dict.nav.faq}</a><Link href={`/${locale}/login`}>{dict.nav.login}</Link><Link href={`/${locale}/register`}>{dict.nav.start}</Link></nav></details></div></div></header>;
}
