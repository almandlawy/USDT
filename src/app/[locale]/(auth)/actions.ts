"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { registerSchema, authIdentifierSchema, passwordSchema } from "@/lib/validation/forms";
import { assertSameOrigin, requestFingerprint } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";

function authError(locale: string, page: string, code: string): never {
  redirect(`/${locale}/${page}?error=${encodeURIComponent(code)}`);
}

async function secureAuthRequest(action: string) {
  await assertSameOrigin();
  if (!isSupabaseConfigured()) return;
  const fingerprint = await requestFingerprint();
  await enforceRateLimit(`auth:${action}:${fingerprint}`, action === "login" ? 8 : 4, 300);
}

async function guardAuthRequest(locale: string, page: string, action: string) {
  try {
    await secureAuthRequest(action);
  } catch (error) {
    const code = error instanceof Error && error.message === "RATE_LIMITED"
      ? "rate_limited"
      : "security_check_failed";
    authError(locale, page, code);
  }
}

export async function loginAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "login", "login");
  if (!isSupabaseConfigured()) authError(locale, "login", "configuration");
  const identifier = authIdentifierSchema.safeParse(String(formData.get("identifier") || ""));
  const password = zPassword(String(formData.get("password") || ""));
  if (!identifier.success || !password) authError(locale, "login", "invalid_credentials");

  const supabase = await createClient();
  const credentials = identifier.data.includes("@") ? { email: identifier.data, password } : { phone: identifier.data, password };
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.user) authError(locale, "login", "invalid_credentials");
  const fingerprint=await requestFingerprint();await supabase.from("login_events").insert({user_id:data.user.id,successful:true,ip_hash:fingerprint,user_agent_hash:fingerprint});
  const requested=String(formData.get("next")||"");const safeNext=requested.startsWith(`/${locale}/`)&&!requested.startsWith("//")?requested:`/${locale}/dashboard`;redirect(safeNext);
}

function zPassword(value: string) { return passwordSchema.safeParse(value).success ? value : null; }

export async function registerAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "register", "register");
  if (!isSupabaseConfigured()) authError(locale, "register", "configuration");
  const parsed = registerSchema.safeParse({
    identifier: String(formData.get("identifier") || ""), password: String(formData.get("password") || ""),
    displayName: String(formData.get("displayName") || ""), locale, termsAccepted: formData.get("termsAccepted"),
  });
  if (!parsed.success) authError(locale, "register", "invalid_form");
  const { identifier, password, displayName } = parsed.data;
  const supabase = await createClient();
  const options = { emailRedirectTo:`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/dashboard`, data: { display_name: displayName, preferred_locale: locale, terms_accepted: true, terms_version: "2026-07-15" } };
  const input = identifier.includes("@") ? { email: identifier, password, options } : { phone: identifier, password, options };
  const { error } = await supabase.auth.signUp(input);
  if (error) authError(locale, "register", "registration_failed");
  redirect(`/${locale}/verify?identifier=${encodeURIComponent(identifier)}`);
}

export async function verifyOtpAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "verify", "otp");
  if (!isSupabaseConfigured()) authError(locale, "verify", "configuration");
  const identifier = String(formData.get("identifier") || "");
  const token = String(formData.get("token") || "");
  if (!authIdentifierSchema.safeParse(identifier).success || !/^\d{6,10}$/.test(token)) authError(locale, "verify", "invalid_code");
  const supabase = await createClient();
  const payload = identifier.includes("@") ? { email: identifier, token, type: "email" as const } : { phone: identifier, token, type: "sms" as const };
  const { error } = await supabase.auth.verifyOtp(payload);
  if (error) authError(locale, "verify", "invalid_code");
  redirect(`/${locale}/dashboard`);
}

export async function resetPasswordAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "reset-password", "reset");
  if (!isSupabaseConfigured()) authError(locale, "reset-password", "configuration");
  const email = String(formData.get("email") || "");
  if (!email.includes("@")) authError(locale, "reset-password", "invalid_email");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/reset-password%3Fmode%3Dupdate` });
  redirect(`/${locale}/reset-password?sent=true`);
}

export async function updatePasswordAction(formData: FormData){
  const locale=String(formData.get("locale")||"ar");await secureAuthRequest("password-update");if(!isSupabaseConfigured())authError(locale,"reset-password","configuration");const password=String(formData.get("password")||"");const confirmation=String(formData.get("confirmation")||"");if(password!==confirmation||!passwordSchema.safeParse(password).success)authError(locale,"reset-password","invalid_password");const supabase=await createClient();const {data}=await supabase.auth.getUser();if(!data.user)authError(locale,"reset-password","session_required");const {error}=await supabase.auth.updateUser({password});if(error)authError(locale,"reset-password","update_failed");redirect(`/${locale}/login?password_updated=true`);
}

export async function resendOtpAction(formData:FormData){
  const locale=String(formData.get("locale")||"ar");await secureAuthRequest("otp-resend");if(!isSupabaseConfigured())authError(locale,"verify","configuration");const identifier=String(formData.get("identifier")||"");if(!authIdentifierSchema.safeParse(identifier).success)authError(locale,"verify","invalid_identifier");const supabase=await createClient();const payload=identifier.includes("@")?{type:"signup" as const,email:identifier}:{type:"sms" as const,phone:identifier};const {error}=await supabase.auth.resend(payload);if(error)authError(locale,"verify","resend_failed");redirect(`/${locale}/verify?identifier=${encodeURIComponent(identifier)}&resent=true`);
}

export async function signOutAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await assertSameOrigin();
  if (isSupabaseConfigured()) { const supabase = await createClient(); await supabase.auth.signOut(); }
  redirect(`/${locale}/login`);
}
