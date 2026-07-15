"use client";
import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/constants";

export function MfaPanel({ locale }: { locale: Locale }) {
  const ar = locale === "ar"; const [message, setMessage] = useState(""); const [qr, setQr] = useState(""); const [factorId, setFactorId] = useState(""); const [code, setCode] = useState("");
  async function enroll() { try { const supabase = createClient(); const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Gulf Gate Authenticator" }); if (error) throw error; setQr(data.totp.qr_code); setFactorId(data.id); } catch { setMessage(ar ? "تعذر بدء 2FA. تحقق من إعداد Supabase." : "Could not start 2FA. Check Supabase configuration."); } }
  async function verify() { try { const supabase = createClient(); const challenge = await supabase.auth.mfa.challenge({ factorId }); if (challenge.error) throw challenge.error; const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code }); if (result.error) throw result.error; setMessage(ar ? "تم تفعيل 2FA بنجاح." : "2FA enabled successfully."); setQr(""); } catch { setMessage(ar ? "رمز التحقق غير صحيح." : "The verification code is invalid."); } }
  return <div className="panel mfaPanel"><div className="panelHeading"><div><span>AUTHENTICATOR SECURITY</span><h2>{ar ? "المصادقة الثنائية" : "Two-factor authentication"}</h2></div><ShieldCheck/></div><p>{ar ? "استخدم تطبيق Authenticator لرفع مستوى الجلسة إلى AAL2. هذا إلزامي لجميع حسابات الإدارة." : "Use an Authenticator app to elevate the session to AAL2. This is mandatory for all administration accounts."}</p>{!qr ? <button className="secondaryButton" type="button" onClick={enroll}><Smartphone/>{ar ? "إعداد تطبيق المصادقة" : "Set up authenticator"}</button> : <div className="mfaSetup"><div className="qrBox"><Image src={qr} alt={ar ? "رمز QR للمصادقة الثنائية" : "Two-factor authentication QR code"} width={190} height={190} unoptimized/></div><label><span>{ar ? "رمز التطبيق" : "Authenticator code"}</span><input value={code} onChange={(event)=>setCode(event.target.value)} inputMode="numeric" maxLength={8}/></label><button className="primaryButton" type="button" onClick={verify}>{ar ? "تحقق وفعّل" : "Verify and enable"}</button></div>}{message && <div className="formAlert">{message}</div>}</div>;
}
