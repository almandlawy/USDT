"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site";
import { emailSchema, passwordSchema, registerSchema } from "@/lib/validation/forms";
import { assertSameOrigin, clientIpHint, requestFingerprint, requestSecurityHashes } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

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

async function requireCaptcha(locale: string, page: string, formData: FormData) {
  const ip = await clientIpHint();
  const result = await verifyTurnstile(formData.get("cf-turnstile-response"), ip);
  if (!result.ok) authError(locale, page, result.code);
}

export async function loginAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "login", "login");
  await requireCaptcha(locale, "login", formData);
  if (!isSupabaseConfigured()) authError(locale, "login", "configuration");

  const emailParsed = emailSchema.safeParse(String(formData.get("email") || formData.get("identifier") || ""));
  const password = String(formData.get("password") || "");
  if (!emailParsed.success || password.length < 1 || password.length > 128) {
    authError(locale, "login", "invalid_credentials");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailParsed.data,
    password,
  });
  if (error || !data.user) authError(locale, "login", "invalid_credentials");

  try {
    const hashes = await requestSecurityHashes();
    await supabase.from("login_events").insert({
      user_id: data.user!.id,
      successful: true,
      ip_hash: hashes.ipHash,
      user_agent_hash: hashes.userAgentHash,
    });
  } catch {
    // Never block login on telemetry failure.
  }

  const requested = String(formData.get("next") || "");
  const safeNext = requested.startsWith(`/${locale}/`) && !requested.startsWith("//") ? requested : `/${locale}/dashboard`;
  redirect(safeNext);
}

export async function registerAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "register", "register");
  await requireCaptcha(locale, "register", formData);
  if (!isSupabaseConfigured()) authError(locale, "register", "configuration");

  const parsed = registerSchema.safeParse({
    email: String(formData.get("email") || formData.get("identifier") || ""),
    password: String(formData.get("password") || ""),
    passwordConfirm: String(formData.get("passwordConfirm") || formData.get("password_confirm") || ""),
    displayName: String(formData.get("displayName") || ""),
    accountType: formData.get("accountType") === "business" ? "business" : "individual",
    locale,
    termsAccepted: formData.get("termsAccepted"),
    privacyAccepted: formData.get("privacyAccepted"),
    riskAccepted: formData.get("riskAccepted"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "passwordConfirm") authError(locale, "register", "password_mismatch");
    if (issue?.path[0] === "password") authError(locale, "register", "weak_password");
    authError(locale, "register", "invalid_form");
  }

  const { email, password, displayName, accountType } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        preferred_locale: locale,
        account_type: accountType,
        terms_accepted: true,
        privacy_accepted: true,
        terms_version: "2026-07-16",
        privacy_version: "2026-07-16",
        risk_version: "2026-07-16",
      },
    },
  });

  if (error) {
    const alreadyRegistered = /already\s*registered|already\s*exists|user_already_exists/i.test(
      `${error.code || ""} ${error.message || ""}`,
    );
    if (alreadyRegistered) authError(locale, "register", "email_already_registered");
    authError(locale, "register", "registration_failed");
  }

  if (data.session) {
    try {
      await supabase.from("profiles").update({
        display_name: displayName,
        account_type: accountType,
        preferred_locale: locale,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2026-07-16",
      }).eq("id", data.user!.id);
    } catch { /* profile trigger may already set fields */ }
    redirect(`/${locale}/dashboard`);
  }

  // Confirm email still enabled in Supabase — operator must disable for direct access.
  authError(locale, "register", "email_confirmation_required");
}

export async function resetPasswordAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "reset-password", "reset");
  await requireCaptcha(locale, "reset-password", formData);
  if (!isSupabaseConfigured()) authError(locale, "reset-password", "configuration");
  const emailParsed = emailSchema.safeParse(String(formData.get("email") || ""));
  // Anti-enumeration: always show the same success path.
  if (emailParsed.success) {
    const supabase = await createClient();
    const next = encodeURIComponent(`/${locale}/reset-password?mode=update`);
    await supabase.auth.resetPasswordForEmail(emailParsed.data, {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=${next}`,
    });
  }
  redirect(`/${locale}/reset-password?sent=true`);
}

export async function updatePasswordAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await guardAuthRequest(locale, "reset-password", "password-update");
  if (!isSupabaseConfigured()) authError(locale, "reset-password", "configuration");
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");
  if (password !== confirmation || !passwordSchema.safeParse(password).success) {
    authError(locale, "reset-password", "invalid_password");
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) authError(locale, "reset-password", "session_required");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) authError(locale, "reset-password", "update_failed");
  // Rotate session / sign out other clients when supported.
  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch { /* older clients may not support scope */ }
  await supabase.auth.signOut();
  redirect(`/${locale}/login?password_updated=true`);
}

export async function signOutAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await assertSameOrigin();
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}/login`);
}
