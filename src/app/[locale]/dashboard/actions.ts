"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv, isSupabaseConfigured } from "@/lib/env";
import { orderRequestSchema, proofMetadataSchema } from "@/lib/validation/forms";
import { assertSameOrigin, requestFingerprint } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkKycLimit } from "@/lib/kyc-limits";

function requireConfigured(locale: string, section: string) {
  if (!isSupabaseConfigured()) redirect(`/${locale}/dashboard/${section}?error=configuration`);
}

async function authenticatedClient(locale: string, section: string) {
  requireConfigured(locale, section);
  await assertSameOrigin();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/${locale}/login`);
  const fingerprint = await requestFingerprint();
  await enforceRateLimit(`user-action:${data.user.id}:${fingerprint}`, 20, 60);
  return { supabase, user: data.user };
}

export async function createOrderAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const section = String(formData.get("orderType") || "buy");
  const { supabase, user } = await authenticatedClient(locale, section);
  const parsed = orderRequestSchema.safeParse({
    orderType: formData.get("orderType"), fiatCurrency: formData.get("fiatCurrency"), network: formData.get("network"),
    amount: formData.get("amount"), walletAddress: formData.get("walletAddress"), transactionPurpose: formData.get("transactionPurpose"), paymentMethodId: formData.get("paymentMethodId"), customerNote: formData.get("customerNote"),
  });
  if (!parsed.success) redirect(`/${locale}/dashboard/${section}?error=invalid_form`);
  const [{ data: kyc }, { data: pricing }, { data: paymentMethod }, { data: demoFlag }, {data:profile}, {data:levelRules}, {data:todayOrders}] = await Promise.all([
    supabase.from("kyc_cases").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pricing_settings").select("reference_rate,flat_fee,percentage_fee,min_amount,max_amount,quote_ttl_seconds,indicative_only").eq("order_type",parsed.data.orderType).eq("fiat_currency",parsed.data.fiatCurrency).eq("network",parsed.data.network).eq("active",true).maybeSingle(),
    supabase.from("payment_methods").select("id,min_amount,max_amount,active").eq("id",parsed.data.paymentMethodId).eq("active",true).maybeSingle(),
    supabase.from("feature_flags").select("enabled").eq("key","demo_requests").maybeSingle(),
    supabase.from("profiles").select("kyc_level").eq("id",user.id).single(),
    supabase.from("kyc_level_limits").select("level,fiat_currency,per_order_limit,daily_limit"),
    supabase.from("orders").select("amount_fiat").eq("user_id",user.id).eq("fiat_currency",parsed.data.fiatCurrency).gte("created_at",new Date(new Date().setHours(0,0,0,0)).toISOString()).not("status","in",'(cancelled,rejected)'),
  ]);
  if (!pricing?.reference_rate || !paymentMethod || demoFlag?.enabled !== true) redirect(`/${locale}/dashboard/${section}?error=request_unavailable`);
  const amount = parsed.data.amount; const minimum = Math.max(Number(pricing.min_amount||0),Number(paymentMethod.min_amount||0)); const maxima=[pricing.max_amount,paymentMethod.max_amount].filter(Boolean).map(Number); const maximum=maxima.length?Math.min(...maxima):null;
  if(amount<minimum||(maximum!==null&&amount>maximum)) redirect(`/${locale}/dashboard/${section}?error=amount_out_of_range`);
  const levelCheck=checkKycLimit(amount,parsed.data.fiatCurrency,Number(profile?.kyc_level||0),(todayOrders||[]).reduce((sum,row)=>sum+Number(row.amount_fiat),0),(levelRules||[]).map(r=>({level:Number(r.level),currency:r.fiat_currency,perOrder:Number(r.per_order_limit),daily:Number(r.daily_limit)})));
  if(!levelCheck.allowed)redirect(`/${locale}/dashboard/${section}?error=kyc_level_limit&reason=${levelCheck.reason}`);
  const rate=Number(pricing.reference_rate); const fee=Number(pricing.flat_fee||0)+(amount*Number(pricing.percentage_fee||0)/100); const total=parsed.data.orderType==="buy"?amount+fee:Math.max(0,amount-fee); const status=kyc?.status==="approved"?"awaiting_payment":"awaiting_kyc"; const now=new Date(); const quoteExpires=new Date(now.getTime()+Number(pricing.quote_ttl_seconds||600)*1000);
  const { data: order, error } = await supabase.from("orders").insert({ user_id:user.id, order_type:parsed.data.orderType, status, fiat_currency:parsed.data.fiatCurrency, network:parsed.data.network, amount_fiat:amount, amount_usdt:amount/rate, quote_rate:rate, fee_amount:fee, total_amount:total, quote_created_at:now.toISOString(), quote_expires_at:quoteExpires.toISOString(), payment_method_id:parsed.data.paymentMethodId, wallet_address:parsed.data.walletAddress, transaction_purpose:parsed.data.transactionPurpose, customer_note:parsed.data.customerNote, is_demo:true }).select("id").single();
  if (error || !order) redirect(`/${locale}/dashboard/${section}?error=create_failed`);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard/orders/${order.id}?created=true`);
}

export async function acceptDemoQuoteAction(formData: FormData) {
  const locale=String(formData.get("locale")||"ar");const {supabase}=await authenticatedClient(locale,"orders");const orderId=String(formData.get("orderId")||"");
  if(!/^[0-9a-f-]{36}$/i.test(orderId))redirect(`/${locale}/dashboard/orders?error=invalid_order`);
  const {error}=await supabase.rpc("accept_demo_quote",{_order_id:orderId});
  if(error)redirect(`/${locale}/dashboard/orders/${orderId}?error=quote_unavailable`);revalidatePath(`/${locale}/dashboard/orders/${orderId}`);redirect(`/${locale}/dashboard/orders/${orderId}?accepted=true`);
}

export async function sendOrderMessageAction(formData:FormData){
  const locale=String(formData.get("locale")||"ar");const {supabase,user}=await authenticatedClient(locale,"orders");const orderId=String(formData.get("orderId")||"");const message=String(formData.get("message")||"").trim().slice(0,3000);
  if(!/^[0-9a-f-]{36}$/i.test(orderId)||message.length<1)redirect(`/${locale}/dashboard/orders/${orderId}?error=invalid_message`);
  const {error}=await supabase.from("order_messages").insert({order_id:orderId,author_id:user.id,message});if(error)redirect(`/${locale}/dashboard/orders/${orderId}?error=message_failed`);revalidatePath(`/${locale}/dashboard/orders/${orderId}`);
}

function validateUploadMetadata(mimeType: string, size: number) {
  const env = getServerEnv();
  const allowed = env.ALLOWED_UPLOAD_MIME_TYPES.split(",");
  if (!allowed.includes(mimeType) || size <= 0 || size > env.MAX_UPLOAD_BYTES) throw new Error("INVALID_FILE");
}

type UploadReference = { path: string; originalName: string };

function parseUploadReference(value: FormDataEntryValue | null): UploadReference | null {
  try {
    const parsed = JSON.parse(String(value || ""));
    return typeof parsed?.path === "string" && typeof parsed?.originalName === "string" ? { path: parsed.path, originalName: parsed.originalName.slice(0,180) } : null;
  } catch { return null; }
}

async function validateStoredUpload(supabase: Awaited<ReturnType<typeof createClient>>, bucket: "kyc-documents" | "payment-proofs", userId: string, reference: UploadReference) {
  const safePath = new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[0-9a-f-]{36}\\.(jpg|png|pdf)$`, "i");
  if (!safePath.test(reference.path) || !reference.originalName) throw new Error("INVALID_PATH");
  const { data: info, error: infoError } = await supabase.storage.from(bucket).info(reference.path);
  if (infoError || !info) throw new Error("FILE_NOT_FOUND");
  const mimeType = String(info.contentType || info.metadata?.mimetype || ""); const size = Number(info.size || 0);
  validateUploadMetadata(mimeType, size);
  const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(reference.path);
  if (downloadError || !blob) throw new Error("FILE_UNREADABLE");
  const bytes = Buffer.from(await blob.arrayBuffer());
  if (bytes.length !== size) throw new Error("FILE_SIZE_MISMATCH");
  const signatureMatches = mimeType === "application/pdf" ? bytes.subarray(0,5).toString("ascii") === "%PDF-"
    : mimeType === "image/png" ? bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
      : mimeType === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : false;
  if (!signatureMatches) throw new Error("FILE_SIGNATURE_MISMATCH");
  return { ...reference, mimeType, size, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function uploadProofAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const { supabase, user } = await authenticatedClient(locale, "proofs");
  const reference = parseUploadReference(formData.get("uploadedProof"));
  const parsed = proofMetadataSchema.safeParse({ transferReference: formData.get("transferReference"), senderName: formData.get("senderName"), amount: formData.get("amount"), paymentAt: formData.get("paymentAt"), customerNote: formData.get("customerNote") });
  const orderId = String(formData.get("orderId") || "");
  if (!reference || !parsed.success || !/^[0-9a-f-]{36}$/i.test(orderId)) redirect(`/${locale}/dashboard/proofs?error=invalid_form`);
  let stored: Awaited<ReturnType<typeof validateStoredUpload>>;
  try { stored = await validateStoredUpload(supabase, "payment-proofs", user.id, reference); } catch { await supabase.storage.from("payment-proofs").remove([reference.path]); redirect(`/${locale}/dashboard/proofs?error=invalid_file`); }
  const { error } = await supabase.from("payment_proofs").insert({ order_id: orderId, user_id: user.id, storage_path: stored.path, original_filename: stored.originalName, mime_type: stored.mimeType, size_bytes: stored.size, sha256: stored.sha256, transfer_reference: parsed.data.transferReference, sender_name: parsed.data.senderName, amount: parsed.data.amount, payment_at: parsed.data.paymentAt.toISOString(), customer_note: parsed.data.customerNote });
  if (error) { await supabase.storage.from("payment-proofs").remove([stored.path]); redirect(`/${locale}/dashboard/proofs?error=save_failed`); }
  redirect(`/${locale}/dashboard/proofs?uploaded=true`);
}

export async function submitKycAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const { supabase, user } = await authenticatedClient(locale, "kyc");
  const accountType = formData.get("accountType") === "business" ? "business" : "individual";
  const nationality = String(formData.get("nationality") || "").trim().slice(0,80);
  const sourceOfFunds = String(formData.get("sourceOfFunds") || "").trim().slice(0,500);
  const transactionPurpose = String(formData.get("transactionPurpose") || "").trim().slice(0,500);
  if (nationality.length < 2 || sourceOfFunds.length < 10 || transactionPurpose.length < 10) redirect(`/${locale}/dashboard/kyc?error=invalid_form`);

  const identityKind = ["national_id_front", "passport"].includes(String(formData.get("identityKind"))) ? String(formData.get("identityKind")) : "passport";
  const documents = [
    { field: "identityFile", kind: identityKind },
    { field: "selfieFile", kind: "selfie" },
    { field: "addressFile", kind: "proof_of_address" },
    { field: "fundsFile", kind: "source_of_funds" },
    { field: "businessFile", kind: "business_registration", optional: accountType !== "business" },
  ];
  let uploadedDocuments: Array<{ field: string; path: string; originalName: string }> = [];
  try { const parsed = JSON.parse(String(formData.get("uploadedDocuments") || "[]")); if (Array.isArray(parsed)) uploadedDocuments = parsed; } catch { /* validated below */ }
  const references = documents.map((document) => ({ ...document, reference: uploadedDocuments.find((item) => item?.field === document.field) })).filter((document) => document.reference?.path && document.reference?.originalName) as Array<{ field: string; kind: string; optional?: boolean; reference: UploadReference }>;
  const missingRequired = documents.some((document) => !document.optional && !references.some((item) => item.field === document.field));
  if (missingRequired) redirect(`/${locale}/dashboard/kyc?error=missing_documents`);

  const payload = { user_id: user.id, account_type: accountType, status: "draft", nationality, source_of_funds: sourceOfFunds, transaction_purpose: transactionPurpose };
  const { data: kycCase, error: caseError } = await supabase.from("kyc_cases").upsert(payload, { onConflict: "user_id" }).select("id").single();
  if (caseError || !kycCase) redirect(`/${locale}/dashboard/kyc?error=case_failed`);

  const uploadedPaths = references.map((item) => item.reference.path);
  for (const item of references) {
    let stored: Awaited<ReturnType<typeof validateStoredUpload>>;
    try { stored = await validateStoredUpload(supabase, "kyc-documents", user.id, item.reference); }
    catch { await supabase.storage.from("kyc-documents").remove(uploadedPaths); redirect(`/${locale}/dashboard/kyc?error=invalid_file`); }
    const { error: documentError } = await supabase.from("kyc_documents").insert({ kyc_case_id: kycCase.id, user_id: user.id, kind: item.kind, storage_path: stored.path, original_filename: stored.originalName, mime_type: stored.mimeType, size_bytes: stored.size, sha256: stored.sha256 });
    if (documentError) { await supabase.storage.from("kyc-documents").remove(uploadedPaths); redirect(`/${locale}/dashboard/kyc?error=document_failed`); }
  }
  const { error: submitError } = await supabase.from("kyc_cases").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", kycCase.id).eq("user_id", user.id);
  if (submitError) redirect(`/${locale}/dashboard/kyc?error=submit_failed`);
  redirect(`/${locale}/dashboard/kyc?submitted=true`);
}

export async function createTicketAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const { supabase, user } = await authenticatedClient(locale, "support");
  const subject = String(formData.get("subject") || "").trim(); const message = String(formData.get("message") || "").trim();
  if (subject.length < 4 || message.length < 10) redirect(`/${locale}/dashboard/support?error=invalid_form`);
  const { data: ticket, error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject: subject.slice(0,180), category: String(formData.get("category") || "general") }).select("id").single();
  if (error || !ticket) redirect(`/${locale}/dashboard/support?error=create_failed`);
  await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, author_id: user.id, message: message.slice(0,5000) });
  redirect(`/${locale}/dashboard/support?created=true`);
}

export async function updateProfileAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const { supabase, user } = await authenticatedClient(locale, "profile");
  const displayName = String(formData.get("displayName") || "").trim().slice(0,120);
  const phone = String(formData.get("phone") || "").trim().slice(0,30);
  const countryCode = String(formData.get("countryCode") || "").trim().toUpperCase().slice(0,2);
  const city = String(formData.get("city") || "").trim().slice(0,100);
  const accountType = formData.get("accountType") === "business" ? "business" : "individual";
  if (displayName.length < 2 || !/^\+[1-9]\d{7,14}$/.test(phone) || !/^[A-Z]{2}$/.test(countryCode) || city.length < 2) redirect(`/${locale}/dashboard/profile?error=invalid_form`);
  const { error } = await supabase.from("profiles").update({ display_name: displayName, phone, country_code: countryCode, city, account_type: accountType, preferred_locale: locale }).eq("id", user.id);
  if (error) redirect(`/${locale}/dashboard/profile?error=save_failed`);
  revalidatePath(`/${locale}/dashboard/profile`);
  redirect(`/${locale}/dashboard/profile?saved=true`);
}

export async function createP2pOrderAction(formData: FormData) {
  const locale=String(formData.get("locale")||"ar");const {supabase,user}=await authenticatedClient(locale,"p2p");const offerId=String(formData.get("offerId")||"");const amount=Number(formData.get("amount")||0);const paymentMethodId=String(formData.get("paymentMethodId")||"");
  if(!/^[0-9a-f-]{36}$/i.test(offerId)||!/^[0-9a-f-]{36}$/i.test(paymentMethodId)||!Number.isFinite(amount)||amount<=0)redirect(`/${locale}/dashboard/p2p?error=invalid_form`);
  const {data:offer}=await supabase.from("p2p_offers").select("id,merchant_id,side,fiat_currency,network,price,min_amount,max_amount,payment_method_ids,payment_window_minutes,active,approval_status,profiles!p2p_offers_merchant_id_fkey(merchant_verified)").eq("id",offerId).maybeSingle();
  if(!offer||!offer.active||offer.approval_status!=="approved"||amount<Number(offer.min_amount)||amount>Number(offer.max_amount)||!offer.payment_method_ids?.includes(paymentMethodId))redirect(`/${locale}/dashboard/p2p?error=offer_unavailable`);
  const merchantProfile=Array.isArray(offer.profiles)?offer.profiles[0]:offer.profiles;if(!merchantProfile?.merchant_verified||offer.merchant_id===user.id)redirect(`/${locale}/dashboard/p2p?error=merchant_unverified`);
  const buyerId=offer.side==="sell"?user.id:offer.merchant_id;const sellerId=offer.side==="sell"?offer.merchant_id:user.id;const deadline=new Date(Date.now()+Number(offer.payment_window_minutes)*60000);
  const {error}=await supabase.from("p2p_orders").insert({offer_id:offer.id,buyer_id:buyerId,seller_id:sellerId,status:"open",fiat_currency:offer.fiat_currency,network:offer.network,price:offer.price,amount_fiat:amount,amount_usdt:amount/Number(offer.price),payment_method_id:paymentMethodId,payment_deadline:deadline.toISOString()});
  if(error)redirect(`/${locale}/dashboard/p2p?error=create_failed`);redirect(`/${locale}/dashboard/p2p?created=true`);
}

export async function openDisputeAction(formData: FormData){
  const locale=String(formData.get("locale")||"ar");const {supabase,user}=await authenticatedClient(locale,"p2p");const p2pOrderId=String(formData.get("p2pOrderId")||"");const reason=String(formData.get("reason")||"").trim().slice(0,2000);if(!/^[0-9a-f-]{36}$/i.test(p2pOrderId)||reason.length<10)redirect(`/${locale}/dashboard/p2p?error=invalid_dispute`);const {error}=await supabase.from("disputes").insert({p2p_order_id:p2pOrderId,opened_by:user.id,reason});if(error)redirect(`/${locale}/dashboard/p2p?error=dispute_failed`);redirect(`/${locale}/dashboard/p2p?submitted=true`);
}
