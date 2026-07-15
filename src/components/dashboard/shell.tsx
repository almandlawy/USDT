import Link from "next/link";
import { Bell, LayoutDashboard, UserRound, BadgeCheck, ArrowDownToLine, ArrowUpFromLine, Handshake, FileCheck2, History, LifeBuoy, Shield, LogOut, Users, CreditCard, BadgeDollarSign, TriangleAlert, Headphones, UserCog, ScrollText, Settings, Menu, Wallet, Scale, Flag, Gavel, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { signOutAction } from "@/app/[locale]/(auth)/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/constants";

const clientIcons = [LayoutDashboard, UserRound, BadgeCheck, ArrowDownToLine, ArrowUpFromLine, Handshake, FileCheck2, History, LifeBuoy, Bell, Shield];
const clientKeys = ["overview", "profile", "kyc", "buy", "sell", "p2p", "proofs", "orders", "support", "notifications", "security"] as const;
const adminIcons = [LayoutDashboard,Users,BadgeCheck,ArrowDownToLine,ArrowUpFromLine,Handshake,FileCheck2,CreditCard,BadgeDollarSign,Scale,SlidersHorizontal,Wallet,TriangleAlert,Gavel,Headphones,Bell,UserCog,Shield,ScrollText,FileCheck2,Settings,Flag];
const adminKeys = ["dashboard","customers","kyc","buyOrders","sellOrders","p2p","proofs","paymentMethods","rates","fees","limits","wallets","compliance","disputes","support","notifications","staff","roles","audit","legal","settings","flags"] as const;
const adminSlugs = ["","customers","kyc","buy-orders","sell-orders","p2p","proofs","payment-methods","rates","fees","limits","wallets","compliance","disputes","support","notifications","staff","roles","audit","legal","settings","feature-flags"];

export function DashboardShell({ locale, dict, admin = false, userName, children }: { locale: Locale; dict: Dictionary; admin?: boolean; userName: string; children: React.ReactNode }) {
  const other = locale === "ar" ? "en" : "ar";
  const base = `/${locale}/${admin ? "admin" : "dashboard"}`;
  const icons = admin ? adminIcons : clientIcons;
  const keys = admin ? adminKeys : clientKeys;
  const navItems = keys.map((key, index) => { const Icon = icons[index]; const slug = admin ? adminSlugs[index] : (key === "overview" ? "" : key); const label = admin ? dict.admin[key as keyof typeof dict.admin] : dict.dashboard[key as keyof typeof dict.dashboard]; return { key, Icon, href: `${base}${slug ? `/${slug}` : ""}`, label }; });
  return <div className="appFrame"><aside className="appSidebar"><div className="sidebarBrand"><Logo locale={locale}/></div><div className="workspaceLabel">{admin ? dict.admin.title : "CLIENT PORTAL"}</div><nav className="sideNav">{navItems.map(({key,Icon,href,label}) => <Link href={href} key={key}><Icon size={18}/><span>{label}</span></Link>)}</nav><div className="sidebarBottom"><Link href={`/${other}/${admin ? "admin" : "dashboard"}`} className="langButton">{other.toUpperCase()}</Link><form action={signOutAction}><input type="hidden" name="locale" value={locale}/><button type="submit"><LogOut size={17}/>{dict.dashboard.signout}</button></form></div></aside><div className="appMain"><PrelaunchBanner locale={locale}/><header className="appTopbar"><details className="mobileNav"><summary aria-label="Menu"><Menu/></summary><nav>{navItems.map(({key,Icon,href,label}) => <Link href={href} key={key}><Icon size={17}/>{label}</Link>)}</nav></details><div><span className="topbarKicker">{admin ? dict.admin.title : dict.dashboard.greeting}</span><strong>{userName}</strong></div><div className="topbarActions"><Link href={`/${locale}/dashboard/notifications`} aria-label="Notifications"><Bell size={19}/><i>3</i></Link><div className="avatar">{userName.slice(0,2).toUpperCase()}</div></div></header><main className="appContent">{children}</main></div></div>;
}
