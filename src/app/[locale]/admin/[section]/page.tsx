import { notFound, redirect } from "next/navigation";
import { CircleAlert, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { canAccessAdminSection, type AdminSection } from "@/lib/admin-permissions";
import { requireStaff } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/dictionaries";
import { getMarketSnapshot } from "@/lib/market-data";
import { getMarketFxSettings } from "@/lib/market-fx";
import { createClient } from "@/lib/supabase/server";
import {
  grantStaffRoleAction, reviewKycAction, reviewProofAction, saveMarketFxAction, savePaymentMethodAction,
  savePricingAction, saveWalletAddressAction, setTradingAction, updateFeatureFlagAction,
  updateOrderStatusAction,
} from "../actions";

const sections = ["customers","kyc","buy-orders","sell-orders","p2p","proofs","payment-methods","rates","fees","limits","wallets","compliance","disputes","support","notifications","staff","roles","audit","legal","settings","feature-flags"] as const;
type Section = typeof sections[number];
type Row = Record<string, unknown>;

const titles: Record<Section,[string,string]> = {
  customers:["العملاء","Customers"],kyc:["التحقق KYC","KYC reviews"],"buy-orders":["طلبات الشراء","Buy orders"],"sell-orders":["طلبات البيع","Sell orders"],p2p:["طلبات P2P","P2P orders"],proofs:["إثباتات الدفع","Payment proofs"],"payment-methods":["طرق الدفع","Payment methods"],rates:["الأسعار","Rates"],fees:["الرسوم","Fees"],limits:["الحدود","Limits"],wallets:["عناوين المحافظ","Wallet addresses"],compliance:["تنبيهات الامتثال","Compliance alerts"],disputes:["النزاعات","Disputes"],support:["الدعم","Support tickets"],notifications:["الإشعارات","Notifications"],staff:["الموظفون","Staff"],roles:["الصلاحيات","Roles"],audit:["سجل التدقيق","Audit log"],legal:["المحتوى القانوني","Legal content"],settings:["إعدادات الموقع","Site settings"],"feature-flags":["مفاتيح الميزات","Feature flags"],
};

function display(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "ON" : "OFF";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value).slice(0,120);
  const text=String(value); return text.length>90?`${text.slice(0,87)}…`:text;
}

async function loadSection(section:Section) {
  const supabase=await createClient();
  let table="profiles", columns="*", filter: [string,string]|undefined;
  switch(section){
    case "customers": table="profiles";columns="id,display_name,phone,account_type,country_code,city,terms_accepted_at,created_at";break;
    case "kyc":table="kyc_cases";columns="id,user_id,account_type,status,submitted_at,reviewed_at,created_at";break;
    case "buy-orders":table="orders";columns="id,reference_number,user_id,status,fiat_currency,amount_fiat,network,total_amount,created_at";filter=["order_type","buy"];break;
    case "sell-orders":table="orders";columns="id,reference_number,user_id,status,fiat_currency,amount_fiat,network,total_amount,created_at";filter=["order_type","sell"];break;
    case "p2p":table="p2p_orders";columns="id,reference_number,status,buyer_id,seller_id,fiat_currency,amount_fiat,manual_release_required,created_at";break;
    case "proofs":table="payment_proofs";columns="id,order_id,user_id,status,sender_name,amount,transfer_reference,mismatch_flag,created_at";break;
    case "payment-methods":table="payment_methods";columns="code,name_en,account_holder,account_number_masked,phone,supported_currencies,min_amount,max_amount,active,sort_order";break;
    case "rates":table="pricing_settings";columns="id,order_type,fiat_currency,network,reference_rate,spread_bps,quote_ttl_seconds,active";break;
    case "fees":table="fee_rules";columns="id,order_type,fiat_currency,network,flat_fee,percentage_fee,active,effective_from,effective_to";break;
    case "limits":table="limit_rules";columns="id,account_type,kyc_status,order_type,fiat_currency,min_amount,max_amount,daily_limit,monthly_limit,active";break;
    case "wallets":table="wallet_addresses";columns="id,label,network,address,purpose,active,approved_at";break;
    case "compliance":table="risk_flags";columns="id,user_id,order_id,p2p_order_id,severity,status,code,summary,assigned_to,created_at";break;
    case "disputes":table="disputes";columns="id,p2p_order_id,opened_by,status,reason,assigned_to,created_at";break;
    case "support":table="support_tickets";columns="id,reference_number,user_id,subject,category,priority,status,created_at";break;
    case "notifications":table="notifications";columns="id,user_id,kind,title_ar,title_en,read_at,created_at";break;
    case "staff":case "roles":table="staff_roles";columns="user_id,role,granted_by,granted_at";break;
    case "audit":table="audit_logs";columns="id,actor_id,actor_role,action,entity_type,entity_id,created_at";break;
    case "legal":table="legal_content";columns="key,version,title_ar,title_en,published,effective_at,updated_at";break;
    case "settings":table="site_settings";columns="key,value,description,updated_at,updated_by";break;
    case "feature-flags":table="feature_flags";columns="key,enabled,description,legal_reference,updated_at";break;
  }
  let query=supabase.from(table).select(columns).limit(100);
  if(filter) query=query.eq(filter[0],filter[1]);
  const {data,error}=await query;
  return { rows:(data||[]) as unknown as Row[], error:error?.message };
}

export default async function AdminSectionPage({params,searchParams}:{params:Promise<{locale:string;section:string}>;searchParams:Promise<Record<string,string|undefined>>}){
  const {locale,section:raw}=await params;if(!isLocale(locale)||!sections.includes(raw as Section))notFound();
  const section=raw as Section;
  const staff=await requireStaff(locale, ["super_admin","operations","compliance","finance","support","reviewer"]);
  if(!canAccessAdminSection(staff.roles, section as AdminSection)) redirect(`/${locale}/admin?error=forbidden`);
  const ar=locale==="ar", query=await searchParams, data=await loadSection(section);
  const keys=Array.from(new Set(data.rows.flatMap(row=>Object.keys(row)))).slice(0,10);
  const rows=data.rows.map(row=>keys.map(key=>display(row[key])));
  const ratesExtras=section==="rates"?await loadRatesExtras(locale):null;
  return <><div className="pageHeading"><div><span>{ar?"الإدارة":"Admin"} / {raw.replaceAll("-"," ")}</span><h1>{titles[section][ar?0:1]}</h1><p>{ar?"بيانات حقيقية محكومة بالدور وصلاحيات الخادم.":"Live data governed by role and server-side permissions."}</p></div>{section==="settings"&&<StatusBadge tone="danger"><LockKeyhole/>{ar?"التنفيذ الحقيقي مقفول":"Live execution locked"}</StatusBadge>}</div>
    {(query.error||data.error)&&<div className="formAlert"><CircleAlert/>{adminErrorMessage(query.error||data.error,ar)}</div>}
    {(query.saved||query.updated)&&<div className="formSuccess"><ShieldCheck/>{ar?"تم الحفظ وسُجل التغيير.":"Saved and audit logged."}</div>}
    {ratesExtras}
    <section className="panel"><div className="panelHeading"><div><span>{ar?"سجلات مضبوطة":"Controlled records"}</span><h2>{titles[section][ar?0:1]}</h2></div><StatusBadge tone="neutral">{data.rows.length}</StatusBadge></div>{rows.length?<DataTable columns={keys} rows={rows}/>:<div className="emptyState"><ShieldCheck/><h3>{ar?"لا توجد سجلات":"No records"}</h3><p>{ar?"ستظهر البيانات هنا بعد إنشائها.":"Records will appear here when created."}</p></div>}</section>
    {section==="kyc"&&<ReviewForm locale={locale} kind="kyc"/>}{section==="proofs"&&<ReviewForm locale={locale} kind="proofs"/>}{["buy-orders","sell-orders"].includes(section)&&<ReviewForm locale={locale} kind="orders"/>}{section==="payment-methods"&&<PaymentMethodForm locale={locale}/>} {section==="rates"&&<PricingForm locale={locale}/>} {section==="wallets"&&<WalletForm locale={locale}/>} {section==="roles"&&<RoleForm locale={locale}/>} {section==="feature-flags"&&<FeatureFlags rows={data.rows} locale={locale}/>} {section==="settings"&&<><TrustReadinessPanel locale={locale}/><ActivationForm locale={locale}/></>}</>;
}

function TrustReadinessPanel({locale}:{locale:"ar"|"en"}){
  const ar=locale==="ar";
  const checks=[
    ["Legal name",Boolean(process.env.NEXT_PUBLIC_LEGAL_NAME?.trim())],
    ["Company name",Boolean(process.env.NEXT_PUBLIC_COMPANY_NAME?.trim())],
    ["Support email",Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim())],
    ["Privacy email",Boolean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim())],
    ["WhatsApp",Boolean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim())],
    ["Address",Boolean(process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim())],
    ["Working hours",Boolean(process.env.NEXT_PUBLIC_WORKING_HOURS?.trim())],
    ["Trade licence (optional)",Boolean(process.env.NEXT_PUBLIC_TRADE_LICENSE_NUMBER?.trim())],
    ["Legal approval reference",Boolean(process.env.LEGAL_APPROVAL_REFERENCE?.trim())],
    ["Turnstile",Boolean(process.env.TURNSTILE_SECRET_KEY&&process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)],
    ["Security hash secret",Boolean(process.env.SECURITY_HASH_SECRET&&process.env.SECURITY_HASH_SECRET.length>=32)],
    ["KYC intake enabled",process.env.KYC_INTAKE_ENABLED==="true"],
    ["Proof intake enabled",process.env.PROOF_INTAKE_ENABLED==="true"],
  ] as const;
  const missing=checks.filter(([,ok])=>!ok);
  return <section className="panel">
    <div className="panelHeading"><div><span>PRE-LAUNCH READINESS</span><h2>{ar?"معلومات الثقة والتجهيز":"Trust and readiness fields"}</h2></div></div>
    <p className="panelLead">{ar?"LEGAL REVIEW REQUIRED BEFORE PUBLIC LAUNCH — لا تُختلق بيانات قانونية. KYC وإثباتات الدفع تبقى مقفلة حتى اكتمال الاسم القانوني وبريد الخصوصية.":"LEGAL REVIEW REQUIRED BEFORE PUBLIC LAUNCH — do not invent legal data. KYC and payment-proof intake stay off until legal name and privacy email are set."}</p>
    <ul className="checkList">{checks.map(([label,ok])=><li key={label} className={ok?"done":""}>{label}{ok?"":ar?" — ناقص":" — missing"}</li>)}</ul>
    {missing.length?<div className="dangerNotice"><CircleAlert/><p>{ar?`حقول ناقصة: ${missing.length}. استقبال المستندات يبقى معطلاً.`:`Missing fields: ${missing.length}. Document intake remains disabled.`}</p></div>:null}
  </section>;
}

async function loadRatesExtras(locale:"ar"|"en"){
  const ar=locale==="ar";
  const [fx, market, supabase]=await Promise.all([getMarketFxSettings(), getMarketSnapshot(), createClient()]);
  const {data:fxAudit}=await supabase.from("audit_logs").select("id,actor_id,action,created_at,new_data").eq("entity_type","market_fx_settings").order("created_at",{ascending:false}).limit(8);
  const usdt=market.assets.find((asset)=>asset.symbol==="USDT");
  return <>
    <section className="panel">
      <div className="panelHeading"><div><span>{ar?"مزود الأسعار":"Market provider"}</span><h2>{ar?"حالة العرض الاسترشادي":"Indicative market status"}</h2></div>
        <StatusBadge tone={market.source==="fallback"?"warning":"success"}>{market.source}</StatusBadge>
      </div>
      <div className="metricGrid adminMetrics">
        <article className="metricCard"><span>{ar?"مصدر السعر":"Source"}</span><strong>{market.source}</strong><small>{market.stale?(ar?"بيانات احتياطية/مشتقة":"Stale / derived"):(ar?"آخر جلب ناجح":"Fresh fetch")}</small></article>
        <article className="metricCard"><span>USDT / IQD</span><strong>{usdt?.iqd != null && usdt.iqd > 0 ? usdt.iqd.toLocaleString(ar?"ar-IQ":"en-US") : "—"}</strong><small>{market.fxNote||"—"}</small></article>
        <article className="metricCard"><span>USD / IQD FX</span><strong>{fx.usdToIqd}</strong><small>{fx.source}</small></article>
        <article className="metricCard"><span>USD / AED FX</span><strong>{fx.usdToAed}</strong><small>{fx.updatedAt?new Date(fx.updatedAt).toLocaleString(ar?"ar-IQ":"en-GB"):(ar?"من البيئة":"From environment")}</small></article>
      </div>
      {market.status==="fallback"?<div className="formAlert"><CircleAlert/>{ar?"تعذر الوصول للمزود — BTC/ETH غير متاحة حالياً.":"Provider unreachable — BTC/ETH currently unavailable."}</div>:null}
      <p className="helperText">{ar?"الأسعار استرشادية فقط وليست عرض بيع أو شراء ملزم. لا تفتح تنفيذاً مالياً.":"Rates are indicative only and not a binding bid/offer. They do not unlock financial execution."}</p>
    </section>
    <section className="panel adminFormPanel">
      <div className="panelHeading"><div><span>{ar?"تعديل مضبوط":"Controlled edit"}</span><h2>{ar?"سعر الصرف الاحتياطي":"Fallback FX rates"}</h2></div><ShieldCheck/></div>
      <form action={saveMarketFxAction} className="formGrid">
        <input type="hidden" name="locale" value={locale}/>
        <label><span>USD → IQD</span><input name="usdToIqd" type="number" step="any" min="0.000001" defaultValue={fx.usdToIqd} required/></label>
        <label><span>USD → AED</span><input name="usdToAed" type="number" step="any" min="0.000001" defaultValue={fx.usdToAed} required/></label>
        <label className="fullField"><span>{ar?"ملاحظة التدقيق":"Audit note"}</span><textarea name="notes" rows={2} placeholder={ar?"سبب التعديل (للإدارة فقط)":"Reason for change (staff only)"}/></label>
        <button className="primaryButton" type="submit"><Save/>{ar?"حفظ الصرف وتسجيل التدقيق":"Save FX and audit"}</button>
      </form>
    </section>
    <section className="panel">
      <div className="panelHeading"><div><span>{ar?"سجل التغييرات":"Change log"}</span><h2>{ar?"تعديلات أسعار الصرف":"FX rate changes"}</h2></div></div>
      {fxAudit?.length
        ? <DataTable columns={ar?["الوقت","الإجراء","الممثل","الملخص"]:["When","Action","Actor","Summary"]} rows={fxAudit.map((row)=>[
            new Date(row.created_at).toLocaleString(ar?"ar-IQ":"en-GB"),
            row.action,
            String(row.actor_id||"—").slice(0,8),
            JSON.stringify(row.new_data||{}).slice(0,80),
          ])}/>
        : <div className="emptyState">{ar?"لا توجد تعديلات مسجلة بعد (يلزم تطبيق migration FX audit).":"No FX audits yet (apply the FX audit migration)."}</div>}
    </section>
  </>;
}

function adminErrorMessage(code:string|undefined,ar:boolean){
  switch(code){
    case "invalid_fx": return ar?"قيم الصرف يجب أن تكون أكبر من صفر.":"FX values must be greater than zero.";
    case "fx_save_failed": return ar?"تعذر حفظ سعر الصرف.":"Could not save FX rates.";
    case "forbidden": return ar?"ليست لديك صلاحية لهذا القسم.":"You do not have access to this section.";
    default: return code|| (ar?"حدث خطأ.":"Something went wrong.");
  }
}

function ReviewForm({locale,kind}:{locale:"ar"|"en";kind:"kyc"|"proofs"|"orders"}){
  const ar=locale==="ar";
  const action=kind==="kyc"?reviewKycAction:kind==="proofs"?reviewProofAction:updateOrderStatusAction;
  const statuses=kind==="orders"
    ?["awaiting_kyc","awaiting_payment","proof_uploaded","under_review","payment_confirmed","compliance_hold","approved","cancelled","rejected","refund_required"]
    :["under_review","approved","rejected","resubmission_required"];
  return <section className="panel adminFormPanel"><div className="panelHeading"><div><span>MANUAL REVIEW / AUDITED</span><h2>{ar?"إجراء مراجعة":"Review action"}</h2></div><ShieldCheck/></div>
    <form action={action} className="formGrid">
      <input type="hidden" name="locale" value={locale}/>
      <label><span>UUID</span><input name="id" required/></label>
      <label><span>{ar?"الحالة الجديدة":"New status"}</span><select name="status">{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
      {kind==="orders"
        ? <label className="fullField"><span>{ar?"ملاحظة المراجع":"Reviewer note"}</span><textarea name="note" rows={3}/></label>
        : <>
          <label className="fullField"><span>{ar?"السبب الظاهر للعميل (إلزامي عند الرفض/إعادة التقديم)":"Customer-visible reason (required for reject/resubmit)"}</span><textarea name="customerReason" rows={3}/></label>
          <label className="fullField"><span>{ar?"ملاحظة داخلية للموظفين فقط":"Internal staff note only"}</span><textarea name="internalNote" rows={3}/></label>
        </>}
      {kind==="proofs"&&<label className="checkLine"><input type="checkbox" name="flagMismatch"/>{ar?"إشارة عدم تطابق":"Flag mismatch"}</label>}
      <button className="primaryButton" type="submit"><Save/>{ar?"حفظ القرار":"Save decision"}</button>
    </form>
  </section>;
}

function PaymentMethodForm({locale}:{locale:"ar"|"en"}){const ar=locale==="ar";return <section className="panel adminFormPanel"><div className="panelHeading"><div><span>PAYMENT METHOD</span><h2>{ar?"إضافة أو تعديل طريقة":"Add or update method"}</h2></div></div><form action={savePaymentMethodAction} className="formGrid"><input type="hidden" name="locale" value={locale}/><label><span>Type</span><select name="code">{["bank_transfer","fib","superqi","zain_cash","cash_representative","wallet_transfer"].map(v=><option key={v}>{v}</option>)}</select></label><label><span>{ar?"صاحب الحساب":"Account holder"}</span><input name="accountHolder"/></label><label><span>{ar?"الاسم العربي":"Arabic name"}</span><input name="nameAr" required/></label><label><span>{ar?"الاسم الإنجليزي":"English name"}</span><input name="nameEn" required/></label><label><span>{ar?"الحساب المخفي":"Masked account"}</span><input name="accountNumberMasked"/></label><label><span>{ar?"الهاتف":"Phone"}</span><input name="phone"/></label><label><span>{ar?"المدينة":"City"}</span><input name="city"/></label><label><span>{ar?"المدن المدعومة":"Supported cities"}</span><input name="cities"/></label><label><span>Min</span><input name="minAmount" type="number"/></label><label><span>Max</span><input name="maxAmount" type="number"/></label><label><span>{ar?"الترتيب":"Sort order"}</span><input name="sortOrder" type="number" defaultValue="100"/></label><label className="checkLine"><input type="checkbox" name="active"/>{ar?"فعالة":"Active"}</label><fieldset className="fullField checkGroup"><legend>{ar?"العملات":"Currencies"}</legend>{["USD","AED","IQD"].map(v=><label key={v}><input type="checkbox" name="currencies" value={v}/>{v}</label>)}</fieldset><label className="fullField"><span>{ar?"تعليمات عربية":"Arabic instructions"}</span><textarea name="instructionsAr" rows={3}/></label><label className="fullField"><span>{ar?"تعليمات إنجليزية":"English instructions"}</span><textarea name="instructionsEn" rows={3}/></label><button className="primaryButton" type="submit"><Save/>{ar?"حفظ":"Save"}</button></form></section>}

function PricingForm({locale}:{locale:"ar"|"en"}){return <section className="panel adminFormPanel"><div className="panelHeading"><div><span>INDICATIVE PRICING</span><h2>Rates, fees & limits</h2></div></div><form action={savePricingAction} className="formGrid"><input type="hidden" name="locale" value={locale}/><label><span>Order type</span><select name="orderType">{["buy","sell","p2p"].map(v=><option key={v}>{v}</option>)}</select></label><label><span>Currency</span><select name="currency">{["USD","AED","IQD"].map(v=><option key={v}>{v}</option>)}</select></label><label><span>Network</span><select name="network"><option>TRC20</option><option>ERC20</option></select></label>{[["referenceRate","Reference rate"],["spreadBps","Spread bps"],["flatFee","Flat fee"],["percentageFee","Fee %"],["minAmount","Min"],["maxAmount","Max"],["quoteTtl","Quote TTL seconds"]].map(([n,l])=><label key={n}><span>{l}</span><input name={n} type="number" step="any" required={n==="referenceRate"||n==="quoteTtl"}/></label>)}<label><span>Label</span><input name="label"/></label><label className="checkLine"><input type="checkbox" name="active"/>Active</label><button className="primaryButton"><Save/>Save</button></form></section>}

function WalletForm({locale}:{locale:"ar"|"en"}){return <section className="panel adminFormPanel"><div className="panelHeading"><div><span>MANUAL ONLY</span><h2>Wallet address registry</h2></div></div><form action={saveWalletAddressAction} className="formGrid"><input type="hidden" name="locale" value={locale}/><label><span>Label</span><input name="label" required/></label><label><span>Network</span><select name="network"><option>TRC20</option><option>ERC20</option></select></label><label className="fullField"><span>Address</span><input name="address" required/></label><label className="checkLine"><input type="checkbox" name="active"/>Approved/active</label><button className="primaryButton"><Save/>Save</button></form></section>}

function RoleForm({locale}:{locale:"ar"|"en"}){return <section className="panel adminFormPanel"><div className="panelHeading"><div><span>SUPER ADMIN</span><h2>Least-privilege role grant</h2></div></div><form action={grantStaffRoleAction} className="formGrid"><input type="hidden" name="locale" value={locale}/><label><span>User UUID</span><input name="userId" required/></label><label><span>Role</span><select name="role">{["super_admin","operations","compliance","finance","support","reviewer"].map(v=><option key={v}>{v}</option>)}</select></label><button className="primaryButton"><Save/>Grant role</button></form></section>}

function FeatureFlags({rows,locale}:{rows:Row[];locale:"ar"|"en"}){return <section className="panel adminFormPanel"><div className="panelHeading"><div><span>SUPER ADMIN</span><h2>Feature controls</h2></div></div><div className="settingsList">{rows.map(row=><form action={updateFeatureFlagAction} className="settingsRow" key={String(row.key)}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="key" value={String(row.key)}/><input type="hidden" name="enabled" value={row.enabled?"false":"true"}/><span><b>{String(row.key)}</b><small>{String(row.description||"")}</small></span><button className="secondaryButton" disabled={row.key==="live_trading"}>{row.enabled?"Disable":"Enable"}</button></form>)}</div></section>}

function ActivationForm({locale}:{locale:"ar"|"en"}){const ar=locale==="ar";return <section className="panel dangerPanel"><div className="panelHeading"><div><span>SUPER ADMIN / AAL2 ONLY</span><h2>{ar?"بوابة تفعيل الخدمة":"Service activation gate"}</h2></div><LockKeyhole/></div><div className="dangerNotice"><CircleAlert/><p>{ar?"يتطلب موافقة قانونية وتقنية مكتوبة. لا تفعّل قبل الترخيص.":"Requires written legal and technical approval. Do not activate before licensing."}</p></div><form action={setTradingAction} className="stackForm"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="enabled" value="true"/><label><span>{ar?"مرجع الموافقة القانونية":"Legal approval reference"}</span><input name="legalReference" required/></label><label><span>{ar?"اكتب ACTIVATE":"Type ACTIVATE"}</span><input name="confirmation" required/></label><button className="dangerButton"><LockKeyhole/>{ar?"طلب التفعيل":"Request activation"}</button></form></section>}
