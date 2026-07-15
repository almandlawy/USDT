import type { Locale } from "@/lib/constants";

const messages = {
  configuration: {
    ar: "تعذر الاتصال بخدمة الحساب مؤقتاً. حاول مرة أخرى لاحقاً.",
    en: "Account service is temporarily unavailable. Please try again later.",
  },
  invalid_form: {
    ar: "البيانات غير مكتملة أو كلمة المرور ضعيفة. يلزم 12 حرفاً مع حرف كبير وصغير ورقم ورمز، مع الموافقة على الشروط.",
    en: "Incomplete details or weak password. Use 12+ characters with upper, lower, number and symbol, and accept the terms.",
  },
  registration_failed: {
    ar: "تعذر إنشاء الحساب. إن كان لديك حساب مسبقاً فسجّل الدخول، أو جرّب بريداً آخر.",
    en: "Could not create the account. If you already have an account, sign in, or try another email.",
  },
  email_already_registered: {
    ar: "تعذر إكمال التسجيل بهذا البريد. سجّل الدخول أو استخدم بريداً آخر.",
    en: "Could not complete registration with this email. Sign in or use another email.",
  },
  email_confirmation_required: {
    ar: "أُنشئ الحساب. افتح رابط التأكيد في بريدك ثم سجّل الدخول.",
    en: "Account created. Open the confirmation link in your email, then sign in.",
  },
  invalid_credentials: {
    ar: "بيانات الدخول غير صحيحة.",
    en: "Invalid sign-in details.",
  },
  rate_limited: {
    ar: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.",
    en: "Too many attempts. Wait a moment and try again.",
  },
  security_check_failed: {
    ar: "فشل التحقق الأمني للطلب. حدّث الصفحة وأعد المحاولة من نفس الموقع.",
    en: "Security check failed. Refresh and retry from the same site.",
  },
  invalid_email: {
    ar: "البريد الإلكتروني غير صالح.",
    en: "The email address is invalid.",
  },
  invalid_password: {
    ar: "كلمة المرور الجديدة غير صالحة أو غير متطابقة.",
    en: "The new password is invalid or does not match.",
  },
  session_required: {
    ar: "انتهت الجلسة. افتح رابط الاستعادة مرة أخرى.",
    en: "Your session expired. Open the recovery link again.",
  },
  update_failed: {
    ar: "تعذر تحديث كلمة المرور. حاول مرة أخرى.",
    en: "Could not update the password. Please try again.",
  },
  invalid_callback: {
    ar: "رابط الاستعادة أو التأكيد غير صالح أو منتهٍ.",
    en: "The recovery or confirmation link is invalid or expired.",
  },
  unexpected: {
    ar: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    en: "An unexpected error occurred. Please try again.",
  },
} as const;

export type AuthErrorCode = keyof typeof messages;

export function authErrorMessage(code: string | undefined, locale: Locale) {
  const key = (code && code in messages ? code : "unexpected") as AuthErrorCode;
  return messages[key][locale];
}
