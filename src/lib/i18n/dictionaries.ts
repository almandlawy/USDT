import type { Locale } from "@/lib/constants";

const ar = {
  nav: { platform: "المنصة", security: "الأمان", compliance: "الأمان والامتثال", faq: "الأسئلة", login: "تسجيل الدخول", start: "إنشاء حساب" },
  hero: { badge: "قيد التجهيز — لا معاملات مالية الآن", titleA: "اشترِ وبِع USDT", titleB: "بطلب واضح ومراجعة موثوقة", text: "أنشئ حساباً، أكمل التحقق، وقدّم طلب شراء أو بيع أو P2P مُدار وتابع حالته — دون طلب إرسال أموال في مرحلة ما قبل الإطلاق.", primary: "إنشاء حساب", secondary: "كيف يعمل" },
  dashboard: { portal: "بوابة العميل", greeting: "مرحباً", overview: "نظرة عامة", trust: "جواز الثقة", profile: "الملف الشخصي", kyc: "التحقق KYC", buy: "طلب شراء", sell: "طلب بيع", p2p: "سوق P2P", proofs: "إثباتات الدفع", orders: "سجل الطلبات", support: "الدعم", notifications: "الإشعارات", security: "الأمان و2FA", signout: "تسجيل الخروج" },
  admin: { title: "مركز العمليات", dashboard: "لوحة الإدارة", intelligence: "ذكاء العمليات", ops: "غرفة العمليات", customers: "العملاء", kyc: "مراجعات KYC", buyOrders:"طلبات الشراء",sellOrders:"طلبات البيع",p2p: "طلبات P2P", proofs: "إثباتات الدفع", paymentMethods: "طرق الدفع", rates:"الأسعار",fees:"الرسوم",limits:"الحدود",wallets:"عناوين المحافظ", compliance: "تنبيهات الامتثال",disputes:"النزاعات", support: "الدعم",notifications:"الإشعارات", staff: "الموظفون",roles:"الصلاحيات", audit: "سجل التدقيق",legal:"المحتوى القانوني", settings: "الإعدادات",flags:"Feature flags" },
};

const en = {
  nav: { platform: "Platform", security: "Security", compliance: "Security & compliance", faq: "FAQ", login: "Sign in", start: "Create account" },
  hero: { badge: "Being prepared — no financial transactions yet", titleA: "Buy & sell USDT", titleB: "with clear request review", text: "Create an account, complete verification, submit a buy, sell or managed P2P request and track its status — without being asked to send funds during pre-launch.", primary: "Create account", secondary: "How it works" },
  dashboard: { portal: "Client portal", greeting: "Welcome", overview: "Overview", trust: "Trust passport", profile: "Profile", kyc: "KYC verification", buy: "Buy request", sell: "Sell request", p2p: "P2P market", proofs: "Payment proofs", orders: "Order history", support: "Support", notifications: "Notifications", security: "Security & 2FA", signout: "Sign out" },
  admin: { title: "Operations center", dashboard: "Admin dashboard", intelligence: "Operations intelligence", ops: "Operations queue", customers: "Customers", kyc: "KYC reviews", buyOrders:"Buy orders",sellOrders:"Sell orders",p2p: "P2P orders", proofs: "Payment proofs", paymentMethods: "Payment methods",rates:"Rates",fees:"Fees",limits:"Limits",wallets:"Wallet addresses", compliance: "Compliance alerts",disputes:"Disputes", support: "Support",notifications:"Notifications", staff: "Staff",roles:"Roles", audit: "Audit logs",legal:"Legal content", settings: "Settings",flags:"Feature flags" },
};

export type Dictionary = typeof ar;
export function getDictionary(locale: Locale): Dictionary { return locale === "en" ? en : ar; }
export function isLocale(value: string): value is Locale { return value === "ar" || value === "en"; }
