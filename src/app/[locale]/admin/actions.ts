"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { PAYMENT_CODES, type Locale, type OrderStatus } from "@/lib/constants";
import { canTransition } from "@/lib/order-state";
import { assertSameOrigin } from "@/lib/security/request";

function configured(locale: Locale, section: string) { if (!isSupabaseConfigured()) redirect(`/${locale}/admin/${section}?error=configuration`); }

export async function assignOpsItemAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "ops"); await assertSameOrigin();
  await requireStaff(locale, ["super_admin", "operations", "compliance", "finance", "reviewer"]);
  const kind = String(formData.get("kind") || "");
  const id = String(formData.get("id") || "");
  const assignee = String(formData.get("assignee") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 2000);
  if (!["kyc", "order", "proof", "dispute"].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(assignee)) {
    redirect(`/${locale}/admin/ops?error=invalid_assignment`);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_ops_item", { _kind: kind, _id: id, _assignee: assignee, _note: note || null });
  if (error) redirect(`/${locale}/admin/ops?error=assignment_failed`);
  revalidatePath(`/${locale}/admin/ops`); redirect(`/${locale}/admin/ops?saved=true`);
}

export async function createReviewBatchAction(formData:FormData){const locale=(formData.get("locale")==="en"?"en":"ar")as Locale;configured(locale,"matching");await assertSameOrigin();const staff=await requireStaff(locale,["super_admin","operations","reviewer"]);const side=String(formData.get("side")||"");const ids=formData.getAll("orderIds").map(String).filter(x=>/^[0-9a-f-]{36}$/i.test(x));if(!["buy","sell"].includes(side)||!ids.length)redirect(`/${locale}/admin/matching?error=invalid_batch`);const s=await createClient();const{data:batch,error}=await s.from("review_batches").insert({name:String(formData.get("name")||`Batch ${new Date().toISOString()}`).slice(0,120),side,created_by:staff.id,status:"open"}).select("id").single();if(error||!batch)redirect(`/${locale}/admin/matching?error=batch_failed`);const{error:itemError}=await s.from("review_batch_items").insert(ids.map(order_id=>({batch_id:batch.id,order_id,added_by:staff.id})));if(itemError)redirect(`/${locale}/admin/matching?error=items_failed`);revalidatePath(`/${locale}/admin/matching`);redirect(`/${locale}/admin/matching?created=true`)}

export async function createComplianceCaseAction(formData:FormData){
  const locale=(formData.get("locale")==="en"?"en":"ar")as Locale;configured(locale,"intelligence");await assertSameOrigin();const staff=await requireStaff(locale,["super_admin","compliance"]);const caseType=String(formData.get("caseType")||"manual"),subject=String(formData.get("subjectUserId")||""),orderId=String(formData.get("orderId")||"");const title=String(formData.get("title")||"").trim().slice(0,180),summary=String(formData.get("summary")||"").trim().slice(0,2000),riskScore=Math.max(0,Math.min(100,Number(formData.get("riskScore")||0)));if(title.length<4||!["kyc","order","proof","p2p","dispute","account","manual"].includes(caseType))redirect(`/${locale}/admin/intelligence?error=invalid_case`);const s=await createClient();const{data,error}=await s.from("compliance_cases").insert({case_type:caseType,title,summary,risk_score:riskScore,priority:riskScore>=75?"urgent":riskScore>=50?"high":"normal",subject_user_id:/^[0-9a-f-]{36}$/i.test(subject)?subject:null,order_id:/^[0-9a-f-]{36}$/i.test(orderId)?orderId:null,created_by:staff.id,sla_due_at:new Date(Date.now()+(riskScore>=75?4:riskScore>=50?12:24)*3600000).toISOString()}).select("id").single();if(error||!data)redirect(`/${locale}/admin/intelligence?error=create_failed`);const checklist=[{label_ar:"مراجعة هوية العميل",label_en:"Review customer identity",sort_order:10},{label_ar:"مراجعة مصدر الأموال والغرض",label_en:"Review source of funds and purpose",sort_order:20},{label_ar:"توثيق القرار والأدلة",label_en:"Document decision and evidence",sort_order:30}];await s.from("case_checklist_items").insert(checklist.map(x=>({...x,case_id:data.id})));revalidatePath(`/${locale}/admin/intelligence`);redirect(`/${locale}/admin/intelligence?created=true`)
}

export async function decideApprovalAction(formData:FormData){const locale=(formData.get("locale")==="en"?"en":"ar")as Locale;configured(locale,"intelligence");await assertSameOrigin();await requireStaff(locale,["super_admin","compliance","finance"]);const id=String(formData.get("id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect(`/${locale}/admin/intelligence?error=invalid_approval`);const s=await createClient();const{error}=await s.rpc("decide_approval_request",{_id:id,_approve:formData.get("decision")==="approve",_note:String(formData.get("note")||"").slice(0,2000)});if(error)redirect(`/${locale}/admin/intelligence?error=approval_failed`);revalidatePath(`/${locale}/admin/intelligence`)}

export async function completeChecklistAction(formData:FormData){const locale=(formData.get("locale")==="en"?"en":"ar")as Locale;configured(locale,"intelligence");await assertSameOrigin();await requireStaff(locale,["super_admin","compliance","reviewer"]);const id=String(formData.get("id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect(`/${locale}/admin/intelligence?error=invalid_checklist`);const s=await createClient();await s.rpc("complete_case_checklist",{_item:id,_completed:formData.get("completed")==="true"});revalidatePath(`/${locale}/admin/intelligence`)}

export async function setTradingAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "settings"); await assertSameOrigin(); await requireStaff(locale, ["super_admin"]);
  const enabled = formData.get("enabled") === "true";
  const legalReference = String(formData.get("legalReference") || "").trim();
  const confirmation = String(formData.get("confirmation") || "");
  if (enabled && confirmation !== "ACTIVATE") redirect(`/${locale}/admin/settings?error=confirmation`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_live_trading", { _enabled: enabled, _legal_reference: legalReference });
  if (error) redirect(`/${locale}/admin/settings?error=activation_blocked`);
  revalidatePath(`/${locale}/admin`); redirect(`/${locale}/admin/settings?updated=true`);
}

export async function savePaymentMethodAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "payment-methods"); await assertSameOrigin(); await requireStaff(locale, ["super_admin", "finance"]);
  const code = String(formData.get("code") || "");
  if (!PAYMENT_CODES.includes(code as (typeof PAYMENT_CODES)[number])) redirect(`/${locale}/admin/payment-methods?error=invalid_code`);
  const min = Number(formData.get("minAmount") || 0); const max = Number(formData.get("maxAmount") || 0);
  const payload = { code, name_ar: String(formData.get("nameAr") || "").slice(0,100), name_en: String(formData.get("nameEn") || "").slice(0,100), account_holder: String(formData.get("accountHolder") || "").slice(0,120), account_number_masked: String(formData.get("accountNumberMasked") || "").slice(0,80), phone:String(formData.get("phone")||"").slice(0,30)||null,city:String(formData.get("city")||"").slice(0,100)||null,instructions_ar: String(formData.get("instructionsAr") || "").slice(0,2000), instructions_en: String(formData.get("instructionsEn") || "").slice(0,2000), min_amount: min || null, max_amount: max || null, supported_currencies: formData.getAll("currencies").map(String), supported_cities: String(formData.get("cities") || "").split(",").map(v=>v.trim()).filter(Boolean),sort_order:Number(formData.get("sortOrder")||100), active: formData.get("active")==="on" };
  const supabase = await createClient(); const { error } = await supabase.from("payment_methods").upsert(payload, { onConflict: "code" });
  if (error) redirect(`/${locale}/admin/payment-methods?error=save_failed`);
  revalidatePath(`/${locale}/admin/payment-methods`); redirect(`/${locale}/admin/payment-methods?saved=true`);
}

export async function reviewKycAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "kyc"); await assertSameOrigin(); await requireStaff(locale, ["super_admin", "compliance", "reviewer"]);
  const id = String(formData.get("id") || ""); const status = String(formData.get("status") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved","rejected","resubmission_required","under_review"].includes(status)) redirect(`/${locale}/admin/kyc?error=invalid_review`);
  const supabase = await createClient(); const { error } = await supabase.rpc("review_kyc",{case_id:id,new_status:status,note:String(formData.get("note")||"").slice(0,2000)});
  if (error) redirect(`/${locale}/admin/kyc?error=save_failed`); revalidatePath(`/${locale}/admin/kyc`);
}

export async function reviewProofAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "proofs"); await assertSameOrigin(); await requireStaff(locale, ["super_admin", "operations", "finance", "reviewer"]);
  const id = String(formData.get("id") || ""); const status = String(formData.get("status") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved","rejected","resubmission_required","under_review"].includes(status)) redirect(`/${locale}/admin/proofs?error=invalid_review`);
  const supabase = await createClient(); const { error } = await supabase.rpc("review_payment_proof",{proof_id:id,new_status:status,note:String(formData.get("note")||"").slice(0,2000),flag_mismatch:formData.get("flagMismatch")==="on"});
  if (error) redirect(`/${locale}/admin/proofs?error=save_failed`); revalidatePath(`/${locale}/admin/proofs`);
}

export async function updateOrderStatusAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "orders"); await assertSameOrigin(); const staff=await requireStaff(locale, ["super_admin", "operations", "compliance", "finance", "reviewer"]);
  const id = String(formData.get("id") || ""); const to = String(formData.get("status") || "") as OrderStatus;
  const supabase = await createClient(); const { data: order } = await supabase.from("orders").select("status").eq("id", id).single(); const { data: live } = await supabase.rpc("is_live_trading");
  if (!order || !canTransition(order.status as OrderStatus, to, Boolean(live))) redirect(`/${locale}/admin/orders?error=transition_blocked`);
  const note=String(formData.get("note")||"").slice(0,2000);
  if(to==="approved"){
    const {error:approvalError}=await supabase.from("approval_requests").insert({action_type:"order_demo_approval",entity_type:"orders",entity_id:id,payload:{from_status:order.status,to_status:to},reason:note.length>=10?note:"Demo order approval requires independent review",requested_by:staff.id});
    if(approvalError)redirect(`/${locale}/admin/orders?error=approval_request_failed`);revalidatePath(`/${locale}/admin/intelligence`);redirect(`/${locale}/admin/intelligence?requested=true`);
  }
  const { error } = await supabase.rpc("transition_order",{order_id:id,new_status:to,note});
  if (error) redirect(`/${locale}/admin/orders?error=save_failed`); revalidatePath(`/${locale}/admin/orders`);
}

export async function savePricingAction(formData:FormData){
  const locale=(formData.get("locale")==="en"?"en":"ar") as Locale;configured(locale,"rates");await assertSameOrigin();await requireStaff(locale,["super_admin","finance"]);const orderType=String(formData.get("orderType"));const currency=String(formData.get("currency"));const network=String(formData.get("network"));if(!["buy","sell","p2p"].includes(orderType)||!["USD","AED","IQD"].includes(currency)||!["TRC20","ERC20"].includes(network))redirect(`/${locale}/admin/rates?error=invalid_form`);const min=Number(formData.get("minAmount")||0),max=Number(formData.get("maxAmount")||0),rate=Number(formData.get("referenceRate")||0),flat=Number(formData.get("flatFee")||0),percentage=Number(formData.get("percentageFee")||0),spread=Number(formData.get("spreadBps")||0),ttl=Number(formData.get("quoteTtl")||600);if(rate<=0||min<0||(max&&max<min)||percentage<0||ttl<30)redirect(`/${locale}/admin/rates?error=invalid_form`);const supabase=await createClient();const {error}=await supabase.from("pricing_settings").upsert({order_type:orderType,fiat_currency:currency,network,reference_rate:rate,spread_bps:spread,flat_fee:flat,percentage_fee:percentage,min_amount:min,max_amount:max||null,quote_ttl_seconds:ttl,active:formData.get("active")==="on",indicative_only:true,label:String(formData.get("label")||"").slice(0,120)},{onConflict:"order_type,fiat_currency,network"});if(error)redirect(`/${locale}/admin/rates?error=save_failed`);revalidatePath(`/${locale}/admin/rates`);redirect(`/${locale}/admin/rates?saved=true`);
}

export async function saveWalletAddressAction(formData:FormData){
  const locale=(formData.get("locale")==="en"?"en":"ar") as Locale;configured(locale,"wallets");await assertSameOrigin();const staff=await requireStaff(locale,["super_admin","finance"]);const network=String(formData.get("network"));const address=String(formData.get("address")||"").trim();const valid=network==="TRC20"?/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address):/^0x[a-fA-F0-9]{40}$/.test(address);if(!valid)redirect(`/${locale}/admin/wallets?error=invalid_address`);const supabase=await createClient();const active=formData.get("active")==="on";const {error}=await supabase.from("wallet_addresses").upsert({label:String(formData.get("label")||"").slice(0,100),network,address,purpose:"manual_settlement",active,approved_by:active?staff.id:null,approved_at:active?new Date().toISOString():null},{onConflict:"network,address"});if(error)redirect(`/${locale}/admin/wallets?error=save_failed`);redirect(`/${locale}/admin/wallets?saved=true`);
}

export async function updateFeatureFlagAction(formData:FormData){
  const locale=(formData.get("locale")==="en"?"en":"ar") as Locale;configured(locale,"feature-flags");await assertSameOrigin();await requireStaff(locale,["super_admin"]);const key=String(formData.get("key")||"");const enabled=formData.get("enabled")==="true";if(key==="live_trading")redirect(`/${locale}/admin/settings?error=use_activation_gate`);if(["deposits","payouts","wallet_automation","p2p_release"].includes(key)&&enabled)redirect(`/${locale}/admin/feature-flags?error=financial_flags_locked`);const supabase=await createClient();const {error}=await supabase.from("feature_flags").update({enabled,updated_at:new Date().toISOString()}).eq("key",key);if(error)redirect(`/${locale}/admin/feature-flags?error=save_failed`);redirect(`/${locale}/admin/feature-flags?updated=true`);
}

export async function grantStaffRoleAction(formData:FormData){
  const locale=(formData.get("locale")==="en"?"en":"ar") as Locale;configured(locale,"roles");await assertSameOrigin();const staff=await requireStaff(locale,["super_admin"]);const userId=String(formData.get("userId")||"");const role=String(formData.get("role")||"");if(!/^[0-9a-f-]{36}$/i.test(userId)||!["super_admin","operations","compliance","finance","support","reviewer"].includes(role))redirect(`/${locale}/admin/roles?error=invalid_form`);const supabase=await createClient();const {error}=await supabase.from("staff_roles").upsert({user_id:userId,role,granted_by:staff.id},{onConflict:"user_id,role"});if(error)redirect(`/${locale}/admin/roles?error=save_failed`);redirect(`/${locale}/admin/roles?saved=true`);
}

/** Indicative FX only — never unlocks live trading or settlement. Audited by DB trigger. */
export async function saveMarketFxAction(formData: FormData) {
  const locale = (formData.get("locale") === "en" ? "en" : "ar") as Locale;
  configured(locale, "rates");
  await assertSameOrigin();
  const staff = await requireStaff(locale, ["super_admin", "finance"]);
  const usdToIqd = Number(formData.get("usdToIqd") || 0);
  const usdToAed = Number(formData.get("usdToAed") || 0);
  const notes = String(formData.get("notes") || "").trim().slice(0, 500);
  if (!Number.isFinite(usdToIqd) || usdToIqd <= 0 || !Number.isFinite(usdToAed) || usdToAed <= 0) {
    redirect(`/${locale}/admin/rates?error=invalid_fx`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("market_fx_settings").upsert({
    id: 1,
    usd_to_iqd: usdToIqd,
    usd_to_aed: usdToAed,
    notes: notes || "Indicative fallback FX — not a live trade quote",
    updated_by: staff.id,
    updated_at: new Date().toISOString(),
  });
  if (error) redirect(`/${locale}/admin/rates?error=fx_save_failed`);
  revalidatePath(`/${locale}/admin/rates`);
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/admin/rates?saved=true`);
}
