import type { Locale } from "@/lib/constants";

const ar = {
  nav: { platform: "المنصة", security: "الأمان", compliance: "الامتثال", faq: "الأسئلة", login: "تسجيل الدخول", start: "إنشاء حساب" },
  hero: { badge: "منصة إدارة طلبات — قبل الإطلاق", titleA: "بوابة موثوقة لإدارة", titleB: "طلبات الأصول الرقمية", text: "تجربة مالية احترافية لإدارة طلبات الشراء والبيع وP2P مع تحقق هوية، إثباتات دفع، مسارات مراجعة وسجل تدقيق كامل.", primary: "استكشف المنصة", secondary: "معايير الأمان" },
  dashboard: { greeting: "مرحباً", overview: "نظرة عامة", trust: "جواز الثقة", profile: "الملف الشخصي", kyc: "التحقق KYC", buy: "طلب شراء", sell: "طلب بيع", p2p: "سوق P2P", proofs: "إثباتات الدفع", orders: "سجل الطلبات", support: "الدعم", notifications: "الإشعارات", security: "الأمان و2FA", signout: "تسجيل الخروج" },
  admin: { title: "مركز العمليات", dashboard: "لوحة الإدارة", intelligence: "ذكاء العمليات", ops: "غرفة العمليات", customers: "العملاء", kyc: "مراجعات KYC", buyOrders:"طلبات الشراء",sellOrders:"طلبات البيع",p2p: "طلبات P2P", proofs: "إثباتات الدفع", paymentMethods: "طرق الدفع", rates:"الأسعار",fees:"الرسوم",limits:"الحدود",wallets:"عناوين المحافظ", compliance: "تنبيهات الامتثال",disputes:"النزاعات", support: "الدعم",notifications:"الإشعارات", staff: "الموظفون",roles:"الصلاحيات", audit: "سجل التدقيق",legal:"المحتوى القانوني", settings: "الإعدادات",flags:"Feature flags" },
};

const en = {
  nav: { platform: "Platform", security: "Security", compliance: "Compliance", faq: "FAQ", login: "Sign in", start: "Create account" },
  hero: { badge: "Request management platform — pre-launch", titleA: "A trusted gateway for", titleB: "digital asset requests", text: "A professional financial experience for managing buy, sell and P2P requests with identity verification, payment evidence, review workflows and a complete audit trail.", primary: "Explore platform", secondary: "Security standards" },
  dashboard: { greeting: "Welcome", overview: "Overview", trust: "Trust passport", profile: "Profile", kyc: "KYC verification", buy: "Buy request", sell: "Sell request", p2p: "P2P market", proofs: "Payment proofs", orders: "Order history", support: "Support", notifications: "Notifications", security: "Security & 2FA", signout: "Sign out" },
  admin: { title: "Operations center", dashboard: "Admin dashboard", intelligence: "Operations intelligence", ops: "Operations queue", customers: "Customers", kyc: "KYC reviews", buyOrders:"Buy orders",sellOrders:"Sell orders",p2p: "P2P orders", proofs: "Payment proofs", paymentMethods: "Payment methods",rates:"Rates",fees:"Fees",limits:"Limits",wallets:"Wallet addresses", compliance: "Compliance alerts",disputes:"Disputes", support: "Support",notifications:"Notifications", staff: "Staff",roles:"Roles", audit: "Audit logs",legal:"Legal content", settings: "Settings",flags:"Feature flags" },
};

export type Dictionary = typeof ar;
export function getDictionary(locale: Locale): Dictionary { return locale === "en" ? en : ar; }
export function isLocale(value: string): value is Locale { return value === "ar" || value === "en"; }
