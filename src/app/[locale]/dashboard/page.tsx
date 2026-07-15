import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, Clock3, Plus, ShieldAlert, WalletCards } from "lucide-react";
import { notFound } from "next/navigation";
import { OrdersActivity } from "@/components/dashboard/orders-activity";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { computeKycProgress } from "@/lib/kyc-progress";
import { isLocale } from "@/lib/i18n/dictionaries";
import { orderStatusLabel, statusTone } from "@/lib/order-display";
import { createClient } from "@/lib/supabase/server";
import { systemStatusLabel } from "@/lib/status-labels";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const ar = locale === "ar";
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const user = await requireUser(locale);
  const supabase = await createClient();

  const [
    recentResult,
    openCountResult,
    kycResult,
    docsResult,
    proofResult,
    ticketResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id,reference_number,order_type,amount_fiat,fiat_currency,network,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("status", "in", "(completed,cancelled,rejected)"),
    supabase.from("kyc_cases").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("kyc_documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["open", "waiting_customer", "waiting_staff", "pending"]),
  ]);

  const queryError =
    recentResult.error
    || openCountResult.error
    || kycResult.error
    || docsResult.error
    || proofResult.error
    || ticketResult.error;

  if (queryError) {
    console.error("[dashboard] failed to load account data", {
      userId: user.id,
      code: queryError.code,
      message: queryError.message,
    });
    return (
      <section className="panel dashboardErrorPanel">
        <div className="panelHeading">
          <div>
            <span>{ar ? "تنبيه" : "Notice"}</span>
            <h2>{ar ? "تعذر تحميل بيانات الحساب" : "Could not load account data"}</h2>
            <p>{ar ? "تعذر تحميل بيانات الحساب مؤقتاً. حاول مرة أخرى." : "Account data could not be loaded temporarily. Please try again."}</p>
          </div>
        </div>
        <Link className="primaryButton" href={`/${locale}/dashboard`}>{ar ? "إعادة المحاولة" : "Retry"}</Link>
      </section>
    );
  }

  const orders = recentResult.data || [];
  const openOrders = openCountResult.count ?? 0;
  const kycStatus = kycResult.data?.status || null;
  const progress = computeKycProgress(kycStatus, docsResult.count || 0);
  const ring = 2 * Math.PI * 50;
  const dash = progress.showPercent ? (progress.percent / 100) * ring : 0;

  const stats = [
    {
      label: ar ? "الطلبات المفتوحة" : "Open requests",
      value: String(openOrders),
      trend: ar ? "إدارية فقط" : "Administrative only",
      icon: <Clock3 />,
    },
    {
      label: ar ? "حالة KYC" : "KYC status",
      value: systemStatusLabel(kycStatus, locale),
      trend: ar ? "تحقق فعلي" : "Live status",
      icon: <BadgeCheck />,
    },
    {
      label: ar ? "الإثباتات" : "Proofs",
      value: String(proofResult.count || 0),
      trend: ar ? "تخزين خاص" : "Private storage",
      icon: <ShieldAlert />,
    },
    {
      label: ar ? "تذاكر الدعم" : "Support tickets",
      value: String(ticketResult.count || 0),
      trend: ar ? "مفتوحة" : "Open",
      icon: <ShieldAlert />,
    },
  ];

  return (
    <>
      <div className="pageHeading">
        <div>
          <span>{ar ? "نظرة عامة للعميل" : "Client overview"}</span>
          <h1>{ar ? "لوحة العميل" : "Client dashboard"}</h1>
          <p>{ar ? "بيانات فعلية من حسابك — لا تنفيذ مالي في وضع ما قبل الإطلاق." : "Live account data — no financial execution in pre-launch."}</p>
        </div>
        <div className="headingActions">
          <Link className="secondaryButton" href={`/${locale}/dashboard/sell`}><WalletCards />{ar ? "طلب بيع" : "Sell request"}</Link>
          <Link className="primaryButton" href={`/${locale}/dashboard/buy`}><Plus />{ar ? "طلب شراء" : "Buy request"}</Link>
        </div>
      </div>

      <div className="metricGrid">
        {stats.map((stat) => (
          <article className="metricCard" key={stat.label}>
            <div className="metricIcon">{stat.icon}</div>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.trend}</small>
          </article>
        ))}
      </div>

      <div className="dashboardGrid">
        <section className="panel widePanel">
          <div className="panelHeading">
            <div>
              <span>{ar ? "النشاط الأخير" : "Recent activity"}</span>
              <h2>{ar ? "آخر الطلبات" : "Recent requests"}</h2>
            </div>
            <Link className="panelLink" href={`/${locale}/dashboard/orders`}>{ar ? "عرض الكل" : "View all"}<Arrow /></Link>
          </div>
          {orders.length ? (
            <OrdersActivity locale={locale} orders={orders} />
          ) : (
            <div className="emptyState emptyStateActions">
              <p>{ar ? "لا توجد طلبات بعد. ابدأ بإنشاء طلب شراء أو بيع تجريبي." : "No requests yet. Start by creating a demo buy or sell request."}</p>
              <div className="headingActions">
                <Link className="primaryButton" href={`/${locale}/dashboard/buy`}><Plus />{ar ? "إنشاء طلب شراء" : "Create buy request"}</Link>
                <Link className="secondaryButton" href={`/${locale}/dashboard/sell`}><WalletCards />{ar ? "إنشاء طلب بيع" : "Create sell request"}</Link>
              </div>
            </div>
          )}
        </section>

        <aside className="panel kycPanel">
          <div className="panelHeading">
            <div>
              <span>{ar ? "التحقق" : "Verification"}</span>
              <h2>{ar ? "حالة KYC" : "KYC status"}</h2>
            </div>
            <StatusBadge tone={statusTone(kycStatus || "not_started")}>{systemStatusLabel(kycStatus, locale)}</StatusBadge>
          </div>
          <div className="kycRing">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="50" />
              <circle
                className={`ringValue${progress.rejected ? " ringRejected" : ""}`}
                cx="60"
                cy="60"
                r="50"
                style={{ strokeDasharray: `${dash} ${ring}` }}
              />
            </svg>
            <strong>
              {progress.showPercent
                ? `${progress.percent}%`
                : orderStatusLabel(kycStatus || "rejected", locale)}
            </strong>
          </div>
          <ul className="checkList">
            <li className={progress.caseOpened ? "done" : ""}>{ar ? "بدء ملف التحقق" : "Verification case"}</li>
            <li className={progress.documentsUploaded ? "done" : ""}>{ar ? "رفع الوثائق" : "Documents uploaded"}</li>
            <li className={progress.underReview || progress.approved ? "done" : ""}>{ar ? "مراجعة الامتثال" : "Compliance review"}</li>
            <li className={progress.approved ? "done" : ""}>{ar ? "الموافقة" : "Approval"}</li>
          </ul>
          <Link className="secondaryButton wide" href={`/${locale}/dashboard/kyc`}>{ar ? "فتح ملف التحقق" : "Open verification"}</Link>
        </aside>
      </div>
    </>
  );
}
