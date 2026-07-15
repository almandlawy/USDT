import Link from "next/link";
import { Menu, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/constants";

export function MarketingHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const other = locale === "ar" ? "en" : "ar";
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  return <header className="marketingHeader"><div className="shell navInner"><Logo locale={locale}/><nav className="desktopNav"><a href="#platform">{dict.nav.platform}</a><a href="#security">{dict.nav.security}</a><a href="#compliance">{dict.nav.compliance}</a><a href="#faq">{dict.nav.faq}</a></nav><div className="navActions"><Link className="langButton" href={`/${other}`}>{other.toUpperCase()}</Link><Link className="textButton" href={`/${locale}/login`}>{dict.nav.login}</Link><Link className="primaryButton small" href={`/${locale}/register`}>{dict.nav.start}<Arrow size={17}/></Link><button className="mobileMenu" aria-label="Menu"><Menu/></button></div></div></header>;
}
