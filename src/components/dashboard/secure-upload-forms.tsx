"use client";

import { useState, type FormEvent } from "react";
import { Building2, FileUp, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitKycAction, uploadProofAction } from "@/app/[locale]/dashboard/actions";
import type { Locale } from "@/lib/constants";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxBytes = 10_485_760;

type UploadedReference = { path: string; originalName: string };

function extension(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

async function uploadPrivateFiles(bucket: "kyc-documents" | "payment-proofs", files: File[]) {
  for (const file of files) {
    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes) throw new Error("INVALID_FILE");
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("AUTH_REQUIRED");
  const uploaded: UploadedReference[] = [];
  try {
    for (const file of files) {
      const path = `${data.user.id}/${crypto.randomUUID()}.${extension(file)}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: "0", upsert: false });
      if (error) throw error;
      uploaded.push({ path, originalName: file.name.slice(0, 180) });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(bucket).remove(uploaded.map((item) => item.path));
    throw error;
  }
}

export function KycUploadForm({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = event.currentTarget; const formData = new FormData(form);
    const fields = ["identityFile", "selfieFile", "addressFile", "fundsFile", "businessFile"];
    const files = fields.map((field) => formData.get(field)).filter((file): file is File => file instanceof File && file.size > 0);
    const accountType = String(formData.get("accountType"));
    if (files.length < 4 || (accountType === "business" && files.length < 5)) { setMessage(ar ? "أرفق جميع المستندات المطلوبة." : "Attach all required documents."); setPending(false); return; }
    let uploaded: UploadedReference[] = [];
    try {
      uploaded = await uploadPrivateFiles("kyc-documents", files);
      fields.forEach((field) => formData.delete(field));
      formData.set("uploadedDocuments", JSON.stringify(fields.map((field, index) => ({ field, ...(uploaded[index] || {}) })).filter((item) => item.path)));
      await submitKycAction(formData);
    } catch {
      if (uploaded.length) { const supabase = createClient(); await supabase.storage.from("kyc-documents").remove(uploaded.map((item) => item.path)); }
      setMessage(ar ? "تعذر رفع الملفات أو إرسالها للمراجعة." : "Files could not be uploaded or submitted for review.");
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="formGrid kycForm"><input type="hidden" name="locale" value={locale}/><label><span>{ar?"نوع الحساب":"Account type"}</span><select name="accountType"><option value="individual">{ar?"فرد":"Individual"}</option><option value="business">{ar?"شركة":"Business"}</option></select></label><label><span>{ar?"الجنسية":"Nationality"}</span><input name="nationality" required/></label><label className="fullField"><span>{ar?"مصدر الأموال":"Source of funds"}</span><textarea name="sourceOfFunds" minLength={10} rows={3} required/></label><label className="fullField"><span>{ar?"غرض المعاملات":"Transaction purpose"}</span><textarea name="transactionPurpose" minLength={10} rows={3} required/></label><label><span>{ar?"نوع وثيقة الهوية":"Identity document type"}</span><select name="identityKind"><option value="passport">{ar?"جواز سفر":"Passport"}</option><option value="national_id_front">{ar?"بطاقة وطنية":"National ID"}</option></select></label><span/><div className="uploadGrid fullField"><DocumentUpload icon={UserRound} name="identityFile" label={ar?"هوية أو جواز":"ID or passport"} required/><DocumentUpload icon={FileUp} name="selfieFile" label={ar?"صورة شخصية":"Selfie"} required/><DocumentUpload icon={MapPin} name="addressFile" label={ar?"إثبات عنوان":"Proof of address"} required/><DocumentUpload icon={ShieldCheck} name="fundsFile" label={ar?"إثبات مصدر الأموال":"Source of funds evidence"} required/><DocumentUpload icon={Building2} name="businessFile" label={ar?"مستند الشركة عند الحاجة":"Business registration if applicable"}/></div>{message&&<div className="formAlert fullField">{message}</div>}<button className="primaryButton" type="submit" disabled={pending}>{pending?(ar?"جاري الرفع الآمن…":"Uploading securely…"):(ar?"رفع خاص وإرسال للمراجعة":"Private upload and submit")}</button></form>;
}

export function ProofUploadForm({ locale, orderId }: { locale: Locale; orderId?: string }) {
  const ar = locale === "ar"; const [pending,setPending]=useState(false); const [message,setMessage]=useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); const formData=new FormData(event.currentTarget); const file=formData.get("proof");
    if (!(file instanceof File) || !file.size) { setMessage(ar?"اختر ملفاً صالحاً.":"Choose a valid file."); setPending(false); return; }
    let uploaded: UploadedReference[]=[];
    try { uploaded=await uploadPrivateFiles("payment-proofs",[file]); formData.delete("proof"); formData.set("uploadedProof",JSON.stringify(uploaded[0])); await uploadProofAction(formData); }
    catch { if(uploaded.length){const supabase=createClient();await supabase.storage.from("payment-proofs").remove(uploaded.map(item=>item.path));} setMessage(ar?"تعذر رفع الإثبات.":"The proof could not be uploaded."); setPending(false); }
  }
  return <form onSubmit={submit} className="formGrid"><input type="hidden" name="locale" value={locale}/>{orderId?<input type="hidden" name="orderId" value={orderId}/>:<label><span>{ar?"معرّف الطلب UUID":"Order UUID"}</span><input name="orderId" placeholder="00000000-0000-0000-0000-000000000000" required/></label>}<label><span>{ar?"مرجع التحويل":"Transfer reference"}</span><input name="transferReference" required/></label><label><span>{ar?"اسم المرسل":"Sender name"}</span><input name="senderName" required/></label><label><span>{ar?"المبلغ":"Amount"}</span><input name="amount" type="number" step="0.01" required/></label><label><span>{ar?"تاريخ ووقت الدفع":"Payment date & time"}</span><input name="paymentAt" type="datetime-local" required/></label><label><span>{ar?"الملف":"JPG, PNG or PDF"}</span><input name="proof" type="file" accept="image/jpeg,image/png,application/pdf" required/></label><label className="fullField"><span>{ar?"ملاحظات":"Notes"}</span><textarea name="customerNote" rows={3}/></label>{message&&<div className="formAlert fullField">{message}</div>}<button className="primaryButton" type="submit" disabled={pending}>{pending?(ar?"جاري الرفع…":"Uploading…"):(ar?"رفع وإرسال للمراجعة":"Upload for review")}</button></form>;
}

function DocumentUpload({ icon: Icon, name, label, required = false }: { icon: typeof UserRound; name: string; label: string; required?: boolean }) {
  return <label className="uploadTile"><Icon/><b>{label}</b><span>JPG, PNG, PDF — 10MB</span><input name={name} type="file" accept="image/jpeg,image/png,application/pdf" required={required}/></label>;
}
