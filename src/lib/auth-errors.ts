import type { Locale } from "@/lib/constants";

const messages = {
  configuration: {
    ar: "تعذر الاتصال بخدمة الحساب مؤقتاً. حاول مرة أخرى لاحقاً.",
    en: "Account service is temporarily unavailable. Please try again later.",
  },
  invalid_form: {
    ar: "البيانات غير مكتملة. أكمل الحقول المطلوبة ووافق على السياسات.",
    en: "Incomplete details. Complete the required fields and accept the policies.",
  },
  weak_password: {
    ar: "كلمة المرور ضعيفة. يلزم 12 حرفاً مع حرف كبير وصغير ورقم ورمز، وتجنب الكلمات الشائعة.",
    en: "Weak password. Use 12+ characters with upper, lower, number and symbol, and avoid common passwords.",
  },
  password_mismatch: {
    ar: "كلمتا المرور غير متطابقتين.",
    en: "Passwords do not match.",
  },
  registration_failed: {
    ar: "تعذر إنشاء الحساب. حاول مرة أخرى أو استخدم بريداً آخر.",
    en: "Could not create the account. Try again or use another email.",
  },
  email_already_registered: {
    ar: "هذا البريد مسجل مسبقاً. سجّل الدخول أو استعد كلمة المرور.",
    en: "This email is already registered. Sign in or reset your password.",
  },
  email_confirmation_required: {
    ar: "أُنشئ الحساب لكن تأكيد البريد ما زال مفعلاً لدى المشغّل. سجّل الدخول بعد التفعيل أو تواصل مع الدعم.",
    en: "Account created, but email confirmation is still enabled by the operator. Sign in after activation or contact support.",
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
  captcha_required: {
    ar: "أكمل التحقق الأمني ثم أعد المحاولة.",
    en: "Complete the security check and try again.",
  },
  captcha_failed: {
    ar: "فشل التحقق الأمني. حدّث الصفحة وأعد المحاولة.",
    en: "Security check failed. Refresh the page and try again.",
  },
  captcha_misconfigured: {
    ar: "التسجيل غير متاح مؤقتاً أثناء التجهيز. حاول لاحقاً أو تواصل مع الدعم.",
    en: "Registration is temporarily unavailable during preparation. Try later or contact support.",
  },
  intake_disabled: {
    ar: "رفع المستندات غير متاح حالياً خلال مرحلة التجهيز.",
    en: "Document upload is not available during the preparation phase.",
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
