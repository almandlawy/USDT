import Link from "next/link";
import { AlertTriangle, ArrowUpLeft, ArrowUpRight, BadgeCheck, Clock3, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function AdminPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();const ar=locale==="ar",Arrow=ar?ArrowUpLeft:ArrowUpRight,supabase=await createClient();
  const [customers,kyc,orders,alerts,queue,live]=await Promise.all([
    supabase.from("profiles").select("id",{count:"exact",head:true}),
    supabase.from("kyc_cases").select("id",{count:"exact",head:true}).in("status",["submitted","under_review","resubmission_required"]),
    supabase.from("orders").select("id",{count:"exact",head:true}).not("status","in",'(completed,cancelled,rejected)'),
    supabase.from("compliance_alerts").select("id",{count:"exact",head:true}).eq("status","open"),
    supabase.from("orders").select("id,reference_number,order_type,status,fiat_currency,amount_fiat,created_at").in("status",["proof_uploaded","under_review","compliance_hold","approved"]).order("created_at",{ascending:false}).limit(10),
    supabase.rpc("is_live_trading"),
  ]);
  const rows=(queue.data||[]).map(o=>[o.reference_number,o.order_type,o.status,`${Number(o.amount_fiat).toLocaleString()} ${o.fiat_currency}`,new Date(o.created_at).toLocaleDateString(locale)]);
  return <><div className="pageHeading"><div><span>OPERATIONS / CONTROL CENTER</span><h1>{ar?"لوحة الإدارة":"Administration dashboard"}</h1><p>{ar?"أرقام حقيقية من قاعدة البيانات، دون أي تنفيذ مالي.":"Live database metrics with no financial execution."}</p></div><StatusBadge tone={live.data?"success":"danger"}><LockKeyhole/>{live.data?"LIVE":"LIVE_TRADING=false"}</StatusBadge></div>
    <div className="metricGrid adminMetrics">{[[Users,ar?"العملاء":"Customers",customers.count||0],[BadgeCheck,ar?"KYC معلق":"Pending KYC",kyc.count||0],[Clock3,ar?"طلبات مفتوحة":"Open requests",orders.count||0],[AlertTriangle,ar?"تنبيهات":"Alerts",alerts.count||0]].map(([Icon,label,value])=>{const I=Icon as typeof Users;return <article className="metricCard" key={String(label)}><div className="metricIcon"><I/></div><span>{String(label)}</span><strong>{String(value)}</strong><small>{ar?"سجل فعلي":"Live record count"}</small></article>})}</div>
    <div className="dashboardGrid adminDashboardGrid"><section className="panel widePanel"><div className="panelHeading"><div><span>OPERATIONS QUEUE</span><h2>{ar?"طلبات تحتاج تصرف":"Requests requiring action"}</h2></div><Link className="panelLink" href={`/${locale}/admin/buy-orders`}>{ar?"عرض الكل":"View all"}<Arrow/></Link></div>{rows.length?<DataTable columns={["Reference","Type","Status","Amount","Created"]} rows={rows}/>:<div className="emptyState"><ShieldCheck/><h3>{ar?"قائمة المراجعة فارغة":"Review queue is empty"}</h3></div>}</section>
    <aside className="panel controlPanel"><div className="panelHeading"><div><span>SERVICE CONTROL</span><h2>{ar?"حالة التشغيل":"Service state"}</h2></div><ShieldCheck/></div><div className="serviceLock"><LockKeyhole/><span><b>{live.data?"LIVE_TRADING=true":"LIVE_TRADING=false"}</b><small>{ar?"التسوية والإطلاق مقفولان افتراضياً":"Settlement and release are locked by default"}</small></span></div><ul className="checkList"><li className="done">RLS enabled</li><li className="done">Private storage</li><li className="done">Immutable audit events</li><li>{ar?"موافقة قانونية مطلوبة":"Legal approval required"}</li></ul><Link className="secondaryButton wide" href={`/${locale}/admin/settings`}>{ar?"إعدادات التفعيل":"Activation settings"}</Link></aside></div></>;
}
