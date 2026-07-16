import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, CircleAlert, LifeBuoy, LockKeyhole, ShieldCheck, Star } from "lucide-react";
import { RequestForm, type PaymentOption, type PricingOption } from "@/components/dashboard/request-form";
import { MfaPanel } from "@/components/dashboard/mfa-panel";
import { OrdersActivity } from "@/components/dashboard/orders-activity";
import { ProofUploadForm, KycUploadForm } from "@/components/dashboard/secure-upload-forms";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { isLocale } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { statusTone } from "@/lib/order-display";
import { createClient } from "@/lib/supabase/server";
import { formatOrderDate, systemStatusLabel } from "@/lib/status-labels";
import {
  createDataRequestAction,
  createP2pOrderAction,
  createTicketAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openDisputeAction,
  updateProfileAction,
} from "../actions";

const validSections=["profile","kyc","buy","sell","p2p","proofs","orders","support","notifications","security"];

export default async function ClientSectionPage({params,searchParams}:{params:Promise<{locale:string;section:string}>;searchParams:Promise<Record<string,string|undefined>>}){
  const {locale:raw,section}=await params;if(!isLocale(raw)||!validSections.includes(section))notFound();const locale=raw;const ar=locale==="ar";const query=await searchParams;const user=await requireUser(locale);const supabase=await createClient();
  const feedback=query.error?<div className="formAlert"><CircleAlert/>{sectionErrorMessage(query.error,ar)}</div>:query.created||query.uploaded||query.submitted||query.saved?<div className="formSuccess"><ShieldCheck/>{ar?"تم حفظ العملية بنجاح.":"The action was saved successfully."}</div>:null;

  if(section==="buy"||section==="sell"){
    const [{data:rules},{data:methods}]=await Promise.all([supabase.from("pricing_settings").select("fiat_currency,network,reference_rate,flat_fee,percentage_fee,min_amount,max_amount,quote_ttl_seconds").eq("order_type",section).eq("active",true),supabase.from("payment_methods").select("id,code,name_ar,name_en,min_amount,max_amount").eq("active",true).order("sort_order")]);
    const pricing:PricingOption[]=(rules||[]).map(rule=>({fiatCurrency:rule.fiat_currency,network:rule.network,referenceRate:Number(rule.reference_rate),flatFee:Number(rule.flat_fee||0),percentageFee:Number(rule.percentage_fee||0),minAmount:Number(rule.min_amount||0),maxAmount:rule.max_amount===null?null:Number(rule.max_amount),quoteTtlSeconds:Number(rule.quote_ttl_seconds||600)}));const paymentMethods:PaymentOption[]=(methods||[]).map(method=>({id:method.id,code:method.code,name:ar?method.name_ar:method.name_en,minAmount:method.min_amount===null?null:Number(method.min_amount),maxAmount:method.max_amount===null?null:Number(method.max_amount)}));
    return <><PageHead title={ar?(section==="buy"?"طلب شراء USDT":"طلب بيع USDT"):`${section==="buy"?"Buy":"Sell"} USDT request`} subtitle={ar?"طلب إداري تجريبي — لا تنفيذ مالي.":"Administrative demo request — no financial execution."}/>{feedback}<RequestForm locale={locale} type={section} pricing={pricing} paymentMethods={paymentMethods}/></>;
  }

  if(section==="profile"){
    const {data:profile}=await supabase.from("profiles").select("display_name,account_type,phone,country_code,city,terms_accepted_at,terms_version,kyc_level").eq("id",user.id).maybeSingle();
    return <><PageHead title={ar?"الملف الشخصي":"Profile"} subtitle={ar?"بيانات الحساب الفعلية ووسائل التواصل.":"Live account and contact details."}/>{feedback}<section className="panel"><div className="profileHeader"><div className="largeAvatar">{(profile?.display_name||"GG").slice(0,2).toUpperCase()}</div><div><h2>{profile?.display_name||user.displayName}</h2><p>{user.email}</p><StatusBadge tone={profile?.terms_accepted_at?"success":"warning"}>{profile?.terms_accepted_at?(ar?`الشروط مقبولة · ${profile.terms_version}`:`Terms accepted · ${profile.terms_version}`):(ar?"الشروط غير مسجلة":"Terms not recorded")}</StatusBadge></div></div><form action={updateProfileAction} className="formGrid profileForm"><input type="hidden" name="locale" value={locale}/><label><span>{ar?"الاسم":"Display name"}</span><input name="displayName" defaultValue={profile?.display_name||""} required/></label><label><span>{ar?"نوع الحساب":"Account type"}</span><select name="accountType" defaultValue={profile?.account_type||"individual"}><option value="individual">{ar?"فرد":"Individual"}</option><option value="business">{ar?"شركة":"Business"}</option></select></label><label><span>{ar?"رقم الهاتف الدولي":"International phone"}</span><input name="phone" defaultValue={profile?.phone||""} placeholder="+9647XXXXXXXXX" required/></label><label><span>{ar?"رمز الدولة":"Country code"}</span><input name="countryCode" defaultValue={profile?.country_code||"IQ"} maxLength={2} required/></label><label><span>{ar?"المدينة":"City"}</span><input name="city" defaultValue={profile?.city||""} required/></label><button className="primaryButton" type="submit">{ar?"حفظ التعديلات":"Save changes"}</button></form></section></>;
  }

  if(section==="kyc"){
    const kycIntake=process.env.KYC_INTAKE_ENABLED==="true"&&Boolean(process.env.NEXT_PUBLIC_LEGAL_NAME?.trim()&&process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim());
    const [{data:kyc},{data:documents}]=await Promise.all([supabase.from("kyc_cases").select("id,status,account_type,nationality,source_of_funds,transaction_purpose,customer_reason,created_at,submitted_at,reviewed_at").eq("user_id",user.id).maybeSingle(),supabase.from("kyc_documents").select("id,kind,status,original_filename,created_at").eq("user_id",user.id).order("created_at",{ascending:false})]);const resubmit=!kyc||["draft","resubmission_required","rejected"].includes(kyc.status);
    const showCustomerReason=kyc?.customer_reason&&["rejected","resubmission_required"].includes(kyc.status);
    return <><PageHead title={ar?"التحقق من الهوية":"Identity verification"} subtitle={ar?"ملف للأفراد والشركات مع تخزين خاص أثناء مرحلة التجهيز.":"Individual and business verification with private storage during preparation."}/>{feedback}<section className="panel"><div className="panelHeading"><div><span>{ar?"ملف الهوية":"Identity case"}{kyc?.id?` / ${kyc.id.slice(0,8)}`:""}</span><h2>{ar?"حالة التحقق":"Verification status"}</h2></div><StatusBadge tone={statusTone(kyc?.status||"not_started")}>{systemStatusLabel(kyc?.status,locale)}</StatusBadge></div><div className="orderTimeline"><TimelineItem label={ar?"إنشاء الملف":"Case created"} date={kyc?.created_at} done={Boolean(kyc)}/><TimelineItem label={ar?"تم الإرسال":"Submitted"} date={kyc?.submitted_at} done={Boolean(kyc?.submitted_at)}/><TimelineItem label={ar?"قرار المراجع":"Review decision"} date={kyc?.reviewed_at} done={Boolean(kyc?.reviewed_at)}/></div>{showCustomerReason?<div className="dangerNotice"><CircleAlert/><p>{kyc?.customer_reason}</p></div>:null}<h3 className="subsectionTitle">{ar?"المستندات الخاصة":"Private documents"}</h3>{documents?.length?<div className="documentList">{documents.map(document=><div key={document.id}><span><b>{document.kind}</b><small>{document.original_filename}</small></span><StatusBadge tone={document.status==="accepted"?"success":document.status==="rejected"?"danger":"warning"}>{systemStatusLabel(document.status,locale)}</StatusBadge></div>)}</div>:<div className="emptyState">{ar?"لا توجد مستندات.":"No documents uploaded."}</div>}</section>{resubmit?(kycIntake?<section className="panel kycSubmissionPanel"><div className="panelHeading"><div><span>{ar?"رفع خاص":"Private upload"}</span><h2>{ar?"إرسال أو إعادة تقديم":"Submit or resubmit"}</h2></div></div><KycUploadForm locale={locale}/></section>:<section className="panel"><div className="marketNotice"><LockKeyhole/><p>{ar?"رفع المستندات غير متاح حالياً خلال مرحلة التجهيز.":"Document upload is not available during the preparation phase."}</p></div></section>):null}</>;
  }

  if(section==="p2p"){
    const [{data:offers},{data:orders},{data:methods},{data:disputes}]=await Promise.all([supabase.from("p2p_offers").select("id,merchant_id,side,fiat_currency,network,price,min_amount,max_amount,payment_method_ids,payment_window_minutes,profiles!p2p_offers_merchant_id_fkey(display_name,merchant_rating,merchant_completion_rate,merchant_verified)").eq("active",true).eq("approval_status","approved").order("price"),supabase.from("p2p_orders").select("id,reference_number,status,fiat_currency,network,price,amount_fiat,amount_usdt,payment_deadline,buyer_id,seller_id,created_at").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at",{ascending:false}),supabase.from("payment_methods").select("id,name_ar,name_en").eq("active",true),supabase.from("disputes").select("id,p2p_order_id,status,reason,created_at").eq("opened_by",user.id).order("created_at",{ascending:false})]);const methodMap=new Map((methods||[]).map(method=>[method.id,ar?method.name_ar:method.name_en]));
    return <><PageHead title={ar?"P2P المُدار":"Managed P2P"} subtitle={ar?"عروض موافق عليها إدارياً؛ لا حجز أو إطلاق تلقائي.":"Admin-approved offers; no automatic escrow or release."}/>{feedback}<div className="marketNotice"><LockKeyhole/>{ar?"كل طلب يحتاج موافقة يدوية. إطلاق الأصول مقفول قبل الإطلاق.":"Every order requires manual approval. Asset release is locked before launch."}</div>{offers?.length?<div className="offerGrid">{offers.map((offer,index)=>{const merchant=Array.isArray(offer.profiles)?offer.profiles[0]:offer.profiles;return <article className="offerCard" key={offer.id}><div className="merchant"><div className="avatar">M{index+1}</div><div><h3>{merchant?.display_name||(ar?"تاجر موثّق":"Verified merchant")} {merchant?.merchant_verified&&<ShieldCheck/>}</h3><span><Star/> {Number(merchant?.merchant_rating||0).toFixed(2)} · {Number(merchant?.merchant_completion_rate||0).toFixed(1)}%</span></div><StatusBadge tone="success">{systemStatusLabel(offer.side,locale)}</StatusBadge></div><div className="offerRate"><span>{ar?"السعر":"Price"}</span><strong>{Number(offer.price).toLocaleString()} {offer.fiat_currency}</strong></div><div className="offerDetails"><span>{ar?"الحدود":"Limits"}<b>{Number(offer.min_amount).toLocaleString()} — {Number(offer.max_amount).toLocaleString()}</b></span><span>{ar?"المهلة":"Timer"}<b>{offer.payment_window_minutes} min</b></span></div><form action={createP2pOrderAction} className="stackForm"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="offerId" value={offer.id}/><label><span>{ar?"المبلغ":"Amount"}</span><input name="amount" type="number" min={offer.min_amount} max={offer.max_amount} required/></label><label><span>{ar?"طريقة الدفع":"Payment method"}</span><select name="paymentMethodId" required>{(offer.payment_method_ids||[]).map((id:string)=><option key={id} value={id}>{methodMap.get(id)||id.slice(0,8)}</option>)}</select></label><button className="secondaryButton wide" type="submit">{ar?"فتح طلب مُدار":"Open managed order"}</button></form></article>})}</div>:<div className="emptyState panel">{ar?"لا توجد عروض P2P موافق عليها حالياً.":"No approved P2P offers are currently available."}</div>}<section className="panel"><div className="panelHeading"><div><span>{ar?"طلباتي":"My orders"}</span><h2>{ar?"طلبات P2P":"P2P orders"}</h2></div></div>{orders?.length?<DataTable columns={ar?["المرجع","المبلغ","USDT","الشبكة","الحالة"]:["Reference","Amount","USDT","Network","Status"]} rows={orders.map(order=>[order.reference_number,`${Number(order.amount_fiat).toLocaleString()} ${order.fiat_currency}`,Number(order.amount_usdt).toFixed(4),order.network,systemStatusLabel(order.status,locale)])}/>:<div className="emptyState">{ar?"لا توجد طلبات P2P.":"No P2P orders."}</div>}</section>{orders?.some(order=>!["released","cancelled"].includes(order.status))&&<section className="panel"><div className="panelHeading"><div><span>{ar?"النزاعات":"Disputes"}</span><h2>{ar?"فتح نزاع":"Open a dispute"}</h2></div></div><form action={openDisputeAction} className="formGrid"><input type="hidden" name="locale" value={locale}/><label><span>{ar?"طلب P2P":"P2P order"}</span><select name="p2pOrderId">{orders.filter(order=>!["released","cancelled"].includes(order.status)).map(order=><option key={order.id} value={order.id}>{order.reference_number}</option>)}</select></label><label className="fullField"><span>{ar?"سبب النزاع":"Dispute reason"}</span><textarea name="reason" minLength={10} rows={4} required/></label><button className="primaryButton">{ar?"إرسال للإدارة":"Submit to administration"}</button></form>{disputes?.length?<div className="documentList">{disputes.map(dispute=><div key={dispute.id}><span><b>{systemStatusLabel(dispute.status,locale)}</b><small>{dispute.reason}</small></span></div>)}</div>:null}</section>}</>;
  }

  if(section==="proofs"){
    const proofIntake=process.env.PROOF_INTAKE_ENABLED==="true"&&Boolean(process.env.NEXT_PUBLIC_LEGAL_NAME?.trim()&&process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim());
    const page=Math.max(1,Number(query.page||1)||1);const pageSize=20;
    const [{data:proofs},{data:orders}]=await Promise.all([supabase.from("payment_proofs").select("id,order_id,original_filename,transfer_reference,amount,status,customer_reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).range((page-1)*pageSize,page*pageSize-1),supabase.from("orders").select("id,reference_number").eq("user_id",user.id).in("status",["awaiting_payment","proof_uploaded","under_review"])]);
    return <><PageHead title={ar?"إثباتات الدفع التجريبية":"Demo payment proofs"} subtitle={ar?"مستند تجريبي فقط — لا ترسل إثبات تحويل حقيقياً.":"Demo document only — do not send a real transfer proof."}/>{feedback}<section className="panel proofPanel">{!proofIntake?<div className="marketNotice"><LockKeyhole/><p>{ar?"رفع المستندات غير متاح حالياً خلال مرحلة التجهيز.":"Document upload is not available during the preparation phase."}</p></div>:orders?.length?<ProofUploadForm locale={locale}/>:<div className="emptyState">{ar?"أنشئ طلباً مؤهلاً أولاً ثم ارفع الإثبات من صفحة تفاصيله.":"Create an eligible request first, then upload from its detail page."}</div>}</section><section className="panel"><div className="panelHeading"><div><span>{ar?"مرفوعات خاصة":"Private submissions"}</span><h2>{ar?"سجل الإثباتات":"Proof history"}</h2></div></div>{proofs?.length?<DataTable columns={ar?["الملف","المرجع","المبلغ","الحالة"]:["File","Reference","Amount","Status"]} rows={proofs.map(proof=>[proof.original_filename,proof.transfer_reference,String(proof.amount),systemStatusLabel(proof.status,locale)])}/>:<div className="emptyState">{ar?"لا توجد إثباتات.":"No proofs uploaded."}</div>}</section></>;
  }

  if(section==="orders"){
    const {data:orders,error}=await supabase.from("orders").select("id,reference_number,order_type,amount_fiat,fiat_currency,network,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
    if(error){console.error("[orders] load failed",{code:error.code});return <><PageHead title={ar?"سجل الطلبات":"Order history"} subtitle={ar?"بيانات فعلية ومراجع وحالات قابلة للتدقيق.":"Live records, references and auditable statuses."}/><section className="panel dashboardErrorPanel"><p>{ar?"تعذر تحميل بيانات الحساب مؤقتاً. حاول مرة أخرى.":"Account data could not be loaded temporarily. Please try again."}</p><Link className="primaryButton" href={`/${locale}/dashboard/orders`}>{ar?"إعادة المحاولة":"Retry"}</Link></section></>;}
    return <><PageHead title={ar?"سجل الطلبات":"Order history"} subtitle={ar?"بيانات فعلية ومراجع وحالات قابلة للتدقيق.":"Live records, references and auditable statuses."}/>{feedback}<section className="panel">{orders?.length?<OrdersActivity locale={locale} orders={orders}/>:<div className="emptyState emptyStateActions"><p>{ar?"لا توجد طلبات بعد. ابدأ بإنشاء طلب شراء أو بيع تجريبي.":"No requests yet. Start by creating a demo buy or sell request."}</p><div className="headingActions"><Link className="primaryButton" href={`/${locale}/dashboard/buy`}>{ar?"إنشاء طلب شراء":"Create buy request"}</Link><Link className="secondaryButton" href={`/${locale}/dashboard/sell`}>{ar?"إنشاء طلب بيع":"Create sell request"}</Link></div></div>}</section></>;
  }

  if(section==="support"){
    const {data:tickets}=await supabase.from("support_tickets").select("id,reference_number,subject,category,priority,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
    return <><PageHead title={ar?"الدعم والتذاكر":"Support tickets"} subtitle={ar?"تواصل موثق مع فريق الدعم.":"Documented communication with support."}/>{feedback}<section className="panel"><form action={createTicketAction} className="formGrid"><input type="hidden" name="locale" value={locale}/><label><span>{ar?"الفئة":"Category"}</span><select name="category"><option value="kyc">{ar?"التحقق":"Verification"}</option><option value="orders">{ar?"الطلبات":"Orders"}</option><option value="payment">{ar?"إثبات الدفع":"Payment proof"}</option><option value="security">{ar?"الأمان":"Security"}</option></select></label><label><span>{ar?"الموضوع":"Subject"}</span><input name="subject" required minLength={4}/></label><label className="fullField"><span>{ar?"الرسالة":"Message"}</span><textarea name="message" rows={6} required minLength={10}/></label><button className="primaryButton" type="submit"><LifeBuoy/>{ar?"فتح تذكرة":"Open ticket"}</button></form></section><section className="panel"><div className="panelHeading"><div><span>{ar?"تذاكري":"My tickets"}</span><h2>{ar?"التذاكر السابقة":"Previous tickets"}</h2></div></div>{tickets?.length?<div className="ticketList">{tickets.map(ticket=><Link key={ticket.id} href={`/${locale}/dashboard/support/${ticket.id}`} className="ticketRow"><span><b>{ticket.reference_number}</b><small>{ticket.subject}</small></span><StatusBadge tone={statusTone(ticket.status)}>{systemStatusLabel(ticket.status,locale)}</StatusBadge><small>{formatOrderDate(ticket.created_at,locale)}</small></Link>)}</div>:<div className="emptyState">{ar?"لا توجد تذاكر.":"No tickets."}</div>}</section></>;
  }

  if(section==="notifications"){
    const {data:notifications,error}=await supabase.from("notifications").select("id,title_ar,title_en,body_ar,body_en,kind,link,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
    if(error){console.error("[notifications] load failed",{code:error.code});return <><PageHead title={ar?"الإشعارات":"Notifications"} subtitle={ar?"تنبيهات الحساب والطلبات والأمان.":"Account, request and security alerts."}/><section className="panel dashboardErrorPanel"><p>{ar?"تعذر تحميل الإشعارات.":"Could not load notifications."}</p><Link className="primaryButton" href={`/${locale}/dashboard/notifications`}>{ar?"إعادة المحاولة":"Retry"}</Link></section></>;}
    const unread=notifications?.filter((item)=>!item.read_at).length||0;
    return <><PageHead title={ar?"الإشعارات":"Notifications"} subtitle={ar?"تنبيهات الحساب والطلبات والأمان.":"Account, request and security alerts."}/>
      <div className="headingActions" style={{marginBottom:"1rem"}}>
        {unread>0?<form action={markAllNotificationsReadAction}><input type="hidden" name="locale" value={locale}/><button className="secondaryButton" type="submit">{ar?`تعليم الكل كمقروء (${unread})`:`Mark all as read (${unread})`}</button></form>:null}
      </div>
      <section className="panel notificationList">{notifications?.length?notifications.map(notification=>{
        const href=normalizeNotificationLink(notification.link,locale);
        return <div key={notification.id} className={notification.read_at?"":"unread"}>
          <Bell/>
          <span>
            <b>{ar?notification.title_ar:notification.title_en}</b>
            <p>{ar?notification.body_ar:notification.body_en}</p>
            <div className="notificationActions">
              {href?<Link href={href}>{ar?"فتح مرتبط":"Open related"}</Link>:null}
              {!notification.read_at?<form action={markNotificationReadAction}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="id" value={notification.id}/><input type="hidden" name="next" value={href||""}/><button type="submit" className="textButton">{ar?"تعليم كمقروء":"Mark read"}</button></form>:null}
            </div>
          </span>
          <small>{formatOrderDate(notification.created_at,locale)}</small>
        </div>;
      }):<div className="emptyState">{ar?"لا توجد إشعارات.":"No notifications."}</div>}</section></>;
  }

  const loginPage=Math.max(1,Number(query.page||1)||1);
  const [{data:logins},{data:dataRequests}]=await Promise.all([
    supabase.from("login_events").select("id,successful,country_hint,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).range((loginPage-1)*10,loginPage*10-1),
    supabase.from("data_requests").select("id,request_type,status,created_at,customer_reason").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20),
  ]);
  return <><PageHead title={ar?"الأمان و2FA":"Security & 2FA"} subtitle={ar?"المصادقة الإضافية وسجل الدخول وطلبات البيانات.":"Additional authentication, sign-in history and data requests."}/>{feedback}<div className="securityPageGrid"><MfaPanel locale={locale}/><section className="panel sessionPanel"><div className="panelHeading"><div><span>{ar?"أحداث الدخول":"Login events"}</span><h2>{ar?"آخر عمليات الدخول":"Recent sign-ins"}</h2></div><ShieldCheck/></div>{logins?.length?<div className="documentList">{logins.map(login=><div key={login.id}><span><b>{login.successful?(ar?"دخول ناجح":"Successful sign-in"):(ar?"محاولة فاشلة":"Failed attempt")}</b><small>{new Date(login.created_at).toLocaleString(ar?"ar-IQ":"en-GB")} · {login.country_hint||"—"}</small></span></div>)}</div>:<div className="emptyState">{ar?"لا توجد أحداث مسجلة بعد.":"No events recorded yet."}</div>}</section></div>
  <section className="panel"><div className="panelHeading"><div><span>{ar?"حقوق البيانات":"Data rights"}</span><h2>{ar?"طلب حذف أو تصدير البيانات":"Request deletion or data export"}</h2></div></div>
    <p className="panelLead">{ar?"راجع سياسة الاحتفاظ قبل الإرسال. سجلات التدقيق الأمنية لا تُحذف تلقائياً.":"Review the retention policy before submitting. Security audit logs are not deleted automatically."}</p>
    <form action={createDataRequestAction} className="formGrid"><input type="hidden" name="locale" value={locale}/>
      <label><span>{ar?"نوع الطلب":"Request type"}</span><select name="requestType" required><option value="account_deletion">{ar?"حذف الحساب":"Account deletion"}</option><option value="data_export">{ar?"تصدير البيانات":"Data export"}</option><option value="data_correction">{ar?"تصحيح البيانات":"Data correction"}</option></select></label>
      <label className="fullField"><span>{ar?"تفاصيل إضافية":"Additional details"}</span><textarea name="details" rows={4} maxLength={2000}/></label>
      <button className="primaryButton" type="submit">{ar?"إرسال الطلب":"Submit request"}</button>
    </form>
    {dataRequests?.length?<div className="documentList" style={{marginTop:"1rem"}}>{dataRequests.map(item=><div key={item.id}><span><b>{item.request_type}</b><small>{systemStatusLabel(item.status,locale)}</small></span><small>{formatOrderDate(item.created_at,locale)}</small></div>)}</div>:null}
    <p style={{marginTop:"1rem"}}><Link href={`/${locale}/legal/retention`}>{ar?"سياسة الاحتفاظ بالبيانات":"Data retention policy"}</Link> · <Link href={`/${locale}/legal/data-deletion`}>{ar?"حذف الحساب والبيانات":"Account and data deletion"}</Link></p>
  </section></>;
}

function PageHead({title,subtitle}:{title:string;subtitle:string}){
  const arabic=/[\u0600-\u06FF]/.test(title);
  return <div className="pageHeading"><div><span>{arabic?"بوابة العميل":"Client portal"}</span><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
function TimelineItem({label,date,done}:{label:string;date?:string|null;done:boolean}){return <div className={done?"done":""}><i/><span><b>{label}</b><small>{date?new Date(date).toLocaleString():"—"}</small></span></div>}
function normalizeNotificationLink(link:string|null|undefined,locale:"ar"|"en"){
  if(!link) return null;
  // Customers may only open dashboard links — never admin or external URLs.
  if(link.startsWith(`/${locale}/dashboard`)) return link;
  if(link.startsWith("/dashboard")) return `/${locale}${link}`;
  if(link.startsWith("/ar/dashboard")||link.startsWith("/en/dashboard")) {
    return link.replace(/^\/(ar|en)/,`/${locale}`);
  }
  return null;
}
function sectionErrorMessage(code:string,ar:boolean){
  switch(code){
    case "intake_disabled":
      return ar ? "رفع المستندات غير متاح حالياً خلال مرحلة التجهيز." : "Document upload is not available during the preparation phase.";
    case "invalid_wallet":
      return ar
        ? "عنوان المحفظة غير صالح. لـ TRC20 لازم يبدأ بـ T ويكون 34 حرفاً بدون الممنوعة 0 O I l. مثال: T9yD14Nj9j7xAB4dbGeiX9h8unkzUcsnQP"
        : "Invalid wallet address. TRC20 must start with T and be 34 characters without 0 O I l. Example: T9yD14Nj9j7xAB4dbGeiX9h8unkzUcsnQP";
    case "invalid_payment_method":
      return ar ? "اختر طريقة دفع صحيحة من القائمة." : "Choose a valid payment method from the list.";
    case "invalid_amount":
      return ar ? "المبلغ غير صالح. أدخل رقماً موجباً ضمن الحد المسموح." : "Invalid amount. Enter a positive number within the allowed limit.";
    case "invalid_purpose":
      return ar ? "غرض المعاملة قصير جداً. اكتب 5 أحرف على الأقل." : "Transaction purpose is too short. Enter at least 5 characters.";
    case "amount_out_of_range":
      return ar ? "المبلغ خارج الحد المسموح لطريقة الدفع أو التسعير." : "Amount is outside the allowed payment or pricing limit.";
    case "request_unavailable":
      return ar ? "الطلب غير متاح حالياً. تحقق من التسعير وطريقة الدفع وميزة الطلبات التجريبية." : "Request unavailable. Check pricing, payment method, and demo_requests flag.";
    case "kyc_level_limit":
      return ar ? "تجاوزت حد مستوى KYC الحالي." : "This exceeds your current KYC level limit.";
    case "create_failed":
      return ar ? "تعذر حفظ الطلب في قاعدة البيانات." : "Could not save the request in the database.";
    default:
      return ar ? "تعذر تنفيذ العملية. تحقق من البيانات أو الصلاحيات." : "The action could not be completed. Check data or permissions.";
  }
}
