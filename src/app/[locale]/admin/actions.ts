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
  configured(locale, "orders"); await assertSameOrigin(); await requireStaff(locale, ["super_admin", "operations", "compliance", "finance", "reviewer"]);
  const id = String(formData.get("id") || ""); const to = String(formData.get("status") || "") as OrderStatus;
  const supabase = await createClient(); const { data: order } = await supabase.from("orders").select("status").eq("id", id).single(); const { data: live } = await supabase.rpc("is_live_trading");
  if (!order || !canTransition(order.status as OrderStatus, to, Boolean(live))) redirect(`/${locale}/admin/orders?error=transition_blocked`);
  const { error } = await supabase.rpc("transition_order",{order_id:id,new_status:to,note:String(formData.get("note")||"").slice(0,2000)});
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
