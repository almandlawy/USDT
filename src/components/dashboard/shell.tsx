"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, LayoutDashboard, UserRound, BadgeCheck, ArrowDownToLine, ArrowUpFromLine, Handshake, FileCheck2,
  History, LifeBuoy, Shield, LogOut, Users, CreditCard, BadgeDollarSign, TriangleAlert, Headphones,
  UserCog, ScrollText, Settings, Menu, Wallet, Scale, Flag, Gavel, SlidersHorizontal, ListTodo, BrainCircuit, X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { signOutAction } from "@/app/[locale]/(auth)/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/constants";
import { formatUnreadBadge } from "@/lib/notifications";

const clientIcons = [LayoutDashboard, Shield, UserRound, BadgeCheck, ArrowDownToLine, ArrowUpFromLine, Handshake, FileCheck2, History, LifeBuoy, Bell, Shield];
const clientKeys = ["overview", "trust", "profile", "kyc", "buy", "sell", "p2p", "proofs", "orders", "support", "notifications", "security"] as const;
const adminIcons = [LayoutDashboard, BrainCircuit, ListTodo, Users, BadgeCheck, ArrowDownToLine, ArrowUpFromLine, Handshake, FileCheck2, CreditCard, BadgeDollarSign, Scale, SlidersHorizontal, Wallet, TriangleAlert, Gavel, Headphones, Bell, UserCog, Shield, ScrollText, FileCheck2, Settings, Flag];
const adminKeys = ["dashboard", "intelligence", "ops", "customers", "kyc", "buyOrders", "sellOrders", "p2p", "proofs", "paymentMethods", "countries", "quoteLinks", "readiness", "rates", "fees", "limits", "wallets", "compliance", "disputes", "support", "notifications", "staff", "roles", "audit", "legal", "settings", "flags"] as const;
const adminSlugs = ["", "intelligence", "ops", "customers", "kyc", "buy-orders", "sell-orders", "p2p", "proofs", "payment-methods", "countries", "quote-links", "readiness", "rates", "fees", "limits", "wallets", "compliance", "disputes", "support", "notifications", "staff", "roles", "audit", "legal", "settings", "feature-flags"];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href.endsWith("/dashboard") || href.endsWith("/admin")) return pathname === href;
  return pathname.startsWith(`${href}/`) || pathname === href;
}

export function DashboardShell({
  locale,
  dict,
  admin = false,
  userName,
  unreadCount = 0,
  allowedAdminSlugs,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  admin?: boolean;
  userName: string;
  unreadCount?: number;
  /** When set, admin nav is filtered to these slugs (empty string = hub). */
  allowedAdminSlugs?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() || `/${locale}/${admin ? "admin" : "dashboard"}`;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const other = locale === "ar" ? "en" : "ar";
  const localeSwitchHref = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${other}`) || `/${other}/${admin ? "admin" : "dashboard"}`;
  const base = `/${locale}/${admin ? "admin" : "dashboard"}`;
  const icons = admin ? adminIcons : clientIcons;
  const keys = admin ? adminKeys : clientKeys;
  const navItems = keys.map((key, index) => {
    const Icon = icons[index];
    const slug = admin ? adminSlugs[index] : (key === "overview" ? "" : key === "trust" ? "trust-center" : key);
    const label = admin ? dict.admin[key as keyof typeof dict.admin] : dict.dashboard[key as keyof typeof dict.dashboard];
    return { key, Icon, href: `${base}${slug ? `/${slug}` : ""}`, label, slug: String(slug) };
  }).filter((item) => {
    if (!admin || !allowedAdminSlugs) return true;
    return allowedAdminSlugs.includes(item.slug);
  });
  const canManagePayments = admin && (!allowedAdminSlugs || allowedAdminSlugs.includes("payment-methods"));
  const paymentCountryItems = canManagePayments
    ? [
        { key: "payments-iraq", Icon: CreditCard, href: `/${locale}/admin/payments/iraq`, label: locale === "ar" ? "مدفوعات العراق" : "Iraq payments" },
        { key: "payments-uae", Icon: BadgeDollarSign, href: `/${locale}/admin/payments/uae`, label: locale === "ar" ? "مدفوعات الإمارات" : "UAE payments" },
      ]
    : [];
  const unread = formatUnreadBadge(unreadCount);
  const portalLabel = admin ? dict.admin.title : dict.dashboard.portal;

  useEffect(() => {
    document.body.classList.toggle("drawerOpen", drawerOpen);
    return () => document.body.classList.remove("drawerOpen");
  }, [drawerOpen]);

  return (
    <div className="appFrame">
      <aside className={`appSidebar${drawerOpen ? " open" : ""}`} id="app-sidebar">
        <div className="sidebarBrand">
          <Logo locale={locale} />
          <button type="button" className="drawerClose" onClick={() => setDrawerOpen(false)} aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"}>
            <X size={18} />
          </button>
        </div>
        <div className="workspaceLabel">{portalLabel}</div>
        <nav className="sideNav" onClick={() => setDrawerOpen(false)}>
          {navItems.map(({ key, Icon, href, label }) => (
            <Link href={href} key={key} className={isActivePath(pathname, href) ? "active" : undefined} aria-current={isActivePath(pathname, href) ? "page" : undefined}>
              <Icon size={18} /><span>{label}</span>
            </Link>
          ))}
          {paymentCountryItems.map(({ key, Icon, href, label }) => (
            <Link href={href} key={key} className={isActivePath(pathname, href) ? "active" : undefined} aria-current={isActivePath(pathname, href) ? "page" : undefined}>
              <Icon size={18} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebarBottom">
          <Link href={localeSwitchHref} className="langButton" hrefLang={other}>{other.toUpperCase()}</Link>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit"><LogOut size={17} />{dict.dashboard.signout}</button>
          </form>
        </div>
      </aside>
      {drawerOpen ? <button type="button" className="drawerBackdrop" aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"} onClick={() => setDrawerOpen(false)} /> : null}
      <div className="appMain">
        <PrelaunchBanner locale={locale} />
        <header className="appTopbar">
          <button type="button" className="mobileNavTrigger" aria-expanded={drawerOpen} aria-controls="app-sidebar" onClick={() => setDrawerOpen(true)}>
            <Menu />
            <span className="srOnly">{locale === "ar" ? "القائمة" : "Menu"}</span>
          </button>
          <div>
            <span className="topbarKicker">{admin ? dict.admin.title : dict.dashboard.greeting}</span>
            <strong>{userName}</strong>
          </div>
          <div className="topbarActions">
            <Link href={`/${locale}/dashboard/notifications`} aria-label={dict.dashboard.notifications} className="notificationBell">
              <Bell size={19} />
              {unread ? <i className="notificationCount">{unread}</i> : null}
            </Link>
            <div className="avatar" title={userName}>{userName.slice(0, 2).toUpperCase()}</div>
          </div>
        </header>
        <main className="appContent">{children}</main>
      </div>
    </div>
  );
}
