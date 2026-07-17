import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const optionalNonEmpty = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      if (!trimmed) return undefined;
      return z.string().url().parse(trimmed);
    }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      if (!trimmed) return undefined;
      if (trimmed.length < 20) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY too short");
      return trimmed;
    }),
  NEXT_PUBLIC_LIVE_TRADING: booleanString.default(false),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalNonEmpty,
  NEXT_PUBLIC_COMPANY_NAME: optionalNonEmpty,
  NEXT_PUBLIC_LEGAL_NAME: optionalNonEmpty,
  NEXT_PUBLIC_SUPPORT_EMAIL: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      if (!trimmed) return undefined;
      return z.string().email().parse(trimmed);
    }),
  NEXT_PUBLIC_PRIVACY_EMAIL: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      if (!trimmed) return undefined;
      return z.string().email().parse(trimmed);
    }),
  NEXT_PUBLIC_WHATSAPP_NUMBER: optionalNonEmpty,
  NEXT_PUBLIC_COMPANY_ADDRESS: optionalNonEmpty,
  NEXT_PUBLIC_WORKING_HOURS: optionalNonEmpty,
  NEXT_PUBLIC_TRADE_LICENSE_NUMBER: optionalNonEmpty,
  NEXT_PUBLIC_KYC_INTAKE_ENABLED: booleanString.default(false),
  NEXT_PUBLIC_PROOF_INTAKE_ENABLED: booleanString.default(true),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmpty,
  LIVE_TRADING: booleanString.default(false),
  LEGAL_APPROVAL_REFERENCE: optionalNonEmpty,
  SECURITY_HASH_SECRET: optionalNonEmpty,
  INTERNAL_HEALTH_TOKEN: optionalNonEmpty,
  TURNSTILE_SECRET_KEY: optionalNonEmpty,
  TURNSTILE_BYPASS_FOR_TESTS: booleanString.default(false),
  CSRF_ALLOWED_HOSTS: optionalNonEmpty,
  KYC_INTAKE_ENABLED: booleanString.default(false),
  PROOF_INTAKE_ENABLED: booleanString.default(true),
  AUTH_EMAIL_PROVIDER_CONFIGURED: booleanString,
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(15).max(300).default(60),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).max(10_485_760).default(10_485_760),
  ALLOWED_UPLOAD_MIME_TYPES: z.string().default("image/jpeg,image/png,application/pdf"),
  DEMO_MODE: booleanString.default(false),
  USD_TO_IQD_RATE: z.coerce.number().positive().optional(),
  USD_TO_AED_RATE: z.coerce.number().positive().optional(),
  MARKET_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(15_000).optional(),
  REAL_PAYMENTS_ENABLED: booleanString.default(false),
  AUTO_FULFILLMENT_ENABLED: booleanString.default(false),
  STRIPE_ENABLED: booleanString.default(false),
  STRIPE_CRYPTO_APPROVED: booleanString.default(false),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalNonEmpty,
  STRIPE_SECRET_KEY: optionalNonEmpty,
  STRIPE_WEBHOOK_SECRET: optionalNonEmpty,
  ZAINCASH_ENABLED: booleanString.default(false),
  ZAINCASH_ENVIRONMENT: z.enum(["uat", "production"]).optional().default("uat"),
  ZAINCASH_BASE_URL: optionalNonEmpty,
  ZAINCASH_CLIENT_ID: optionalNonEmpty,
  ZAINCASH_CLIENT_SECRET: optionalNonEmpty,
  ZAINCASH_API_KEY: optionalNonEmpty,
  ZAINCASH_SERVICE_TYPE: optionalNonEmpty,
  ZAINCASH_WEBHOOK_SECRET: optionalNonEmpty,
  EAND_MONEY_ENABLED: booleanString.default(false),
  EAND_MONEY_MODE: z.enum(["manual", "api"]).optional().default("manual"),
  EAND_MONEY_REQUEST_PHONE: optionalNonEmpty,
  EAND_MONEY_QR_IMAGE_URL: optionalNonEmpty,
  DUPAY_ENABLED: booleanString.default(false),
  DUPAY_MODE: z.enum(["manual", "api"]).optional().default("manual"),
  DUPAY_REQUEST_PHONE: optionalNonEmpty,
  DUPAY_QR_IMAGE_URL: optionalNonEmpty,
  BANK_TRANSFER_ENABLED: booleanString.default(false),
  MARKET_PROVIDER_PRIMARY: optionalNonEmpty,
  MARKET_PROVIDER_SECONDARY: optionalNonEmpty,
  MARKET_PROVIDER_API_KEY: optionalNonEmpty,
  MARKET_PRICE_MAX_AGE_SECONDS: z.coerce.number().int().min(30).max(3600).optional(),
  QUOTE_DEFAULT_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(3600).optional(),
});

function assertNoPublicServiceRole() {
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_") || !value) continue;
    if (key.includes("SERVICE_ROLE") || /service_role/i.test(value)) {
      throw new Error(`Service role material must never appear in public env (${key})`);
    }
  }
}

/** True only on the Vercel Production deployment — not local `next start` / CI. */
export function isVercelProduction() {
  return process.env.VERCEL_ENV === "production";
}

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_LIVE_TRADING: process.env.NEXT_PUBLIC_LIVE_TRADING,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_COMPANY_NAME: process.env.NEXT_PUBLIC_COMPANY_NAME,
  NEXT_PUBLIC_LEGAL_NAME: process.env.NEXT_PUBLIC_LEGAL_NAME,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_PRIVACY_EMAIL: process.env.NEXT_PUBLIC_PRIVACY_EMAIL,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_COMPANY_ADDRESS: process.env.NEXT_PUBLIC_COMPANY_ADDRESS,
  NEXT_PUBLIC_WORKING_HOURS: process.env.NEXT_PUBLIC_WORKING_HOURS,
  NEXT_PUBLIC_TRADE_LICENSE_NUMBER: process.env.NEXT_PUBLIC_TRADE_LICENSE_NUMBER,
  NEXT_PUBLIC_KYC_INTAKE_ENABLED: process.env.NEXT_PUBLIC_KYC_INTAKE_ENABLED,
  NEXT_PUBLIC_PROOF_INTAKE_ENABLED: process.env.NEXT_PUBLIC_PROOF_INTAKE_ENABLED,
});

export function getServerEnv() {
  const parsed = serverSchema.parse(process.env);

  assertNoPublicServiceRole();

  if (parsed.LIVE_TRADING !== parsed.NEXT_PUBLIC_LIVE_TRADING) {
    throw new Error("LIVE_TRADING and NEXT_PUBLIC_LIVE_TRADING must match");
  }

  // Pre-launch hard lock — never allow true in this codebase phase.
  if (parsed.LIVE_TRADING) {
    throw new Error("LIVE_TRADING must remain false during pre-launch");
  }

  // Auto USDT send is forbidden in this phase (build/runtime fail-closed).
  if (parsed.AUTO_FULFILLMENT_ENABLED) {
    throw new Error("AUTO_FULFILLMENT_ENABLED must remain false until licensing, key custody, dual control, and legal approval");
  }

  if (parsed.STRIPE_ENABLED) {
    if (!parsed.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required when STRIPE_ENABLED=true");
    }
    if (isVercelProduction() && !parsed.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is required in production when STRIPE_ENABLED=true");
    }
  }

  if (parsed.ZAINCASH_ENABLED) {
    if (!parsed.ZAINCASH_CLIENT_ID || !parsed.ZAINCASH_CLIENT_SECRET || !parsed.ZAINCASH_BASE_URL) {
      throw new Error("Zain Cash credentials and ZAINCASH_BASE_URL are required when ZAINCASH_ENABLED=true");
    }
    if (isVercelProduction() && !parsed.ZAINCASH_WEBHOOK_SECRET) {
      throw new Error("ZAINCASH_WEBHOOK_SECRET is required in production when ZAINCASH_ENABLED=true");
    }
  }

  if (isVercelProduction()) {
    if (parsed.DEMO_MODE) {
      throw new Error("DEMO_MODE must be false in production");
    }
    if (parsed.TURNSTILE_BYPASS_FOR_TESTS) {
      throw new Error("TURNSTILE_BYPASS_FOR_TESTS must be false in production");
    }
    if (parsed.NEXT_PUBLIC_APP_URL.includes("localhost") || parsed.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")) {
      throw new Error("NEXT_PUBLIC_APP_URL must not use localhost in production");
    }
    if (!parsed.SECURITY_HASH_SECRET || parsed.SECURITY_HASH_SECRET.length < 32) {
      throw new Error("SECURITY_HASH_SECRET must be at least 32 characters in production");
    }
    if (!parsed.INTERNAL_HEALTH_TOKEN || parsed.INTERNAL_HEALTH_TOKEN.length < 32) {
      throw new Error("INTERNAL_HEALTH_TOKEN must be at least 32 characters in production");
    }
    if (!parsed.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !parsed.TURNSTILE_SECRET_KEY) {
      throw new Error("Turnstile keys are required in production while public registration is enabled");
    }
  } else if (process.env.NODE_ENV === "production" && parsed.DEMO_MODE) {
    throw new Error("DEMO_MODE must be false in production");
  }

  if (parsed.LIVE_TRADING && !parsed.LEGAL_APPROVAL_REFERENCE) {
    throw new Error("LIVE_TRADING cannot be enabled without LEGAL_APPROVAL_REFERENCE");
  }

  return parsed;
}

export function isSupabaseConfigured() {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
