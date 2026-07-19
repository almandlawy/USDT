import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, Menu } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/constants";

export function MarketingHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const other = locale === "ar" ? "en" : "ar";
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const ar = locale === "ar";
  const menuLabel = ar ? "فتح قائمة التنقل" : "Open navigation menu";
  const home = `/${locale}`;

  const links = [
    [`${home}#quote`, ar ? "السعر" : "Quote"],
    [`${home}#country-payments`, ar ? "طرق الدفع" : "Payments"],
    [`${home}#secure-links`, ar ? "رابط العرض" : "Quote link"],
    [`${home}#security`, dict.nav.security],
    [`${home}#faq`, dict.nav.faq],
  ];

  return (
    <header className="marketingHeader luxuryHeader">
      <div className="shell navInner">
        <Logo locale={locale} variant="light" />
        <nav className="desktopNav" aria-label={ar ? "التنقل الرئيسي" : "Primary navigation"}>
          {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="navActions">
          <Link className="langButton" href={`/${other}`} hrefLang={other} aria-label={other === "en" ? "English" : "العربية"}>{other.toUpperCase()}</Link>
          <Link className="textButton navLogin" href={`/${locale}/login`}>{dict.nav.login}</Link>
          <Link className="primaryButton small" href={`/${locale}/register`}>{dict.nav.start}<Arrow size={17} /></Link>
          <details className="mobileMenu">
            <summary aria-label={menuLabel}><Menu /></summary>
            <nav aria-label={menuLabel}>
              {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
              <Link href={`/${locale}/login`}>{dict.nav.login}</Link>
              <Link href={`/${locale}/register`}>{dict.nav.start}</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
