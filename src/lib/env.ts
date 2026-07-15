import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_LIVE_TRADING: booleanString.default(false),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30).optional(),
  LIVE_TRADING: booleanString.default(false),
  LEGAL_APPROVAL_REFERENCE: z.string().optional(),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(15).max(300).default(60),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).max(10_485_760).default(10_485_760),
  ALLOWED_UPLOAD_MIME_TYPES: z.string().default("image/jpeg,image/png,application/pdf"),
  DEMO_MODE: booleanString.default(false),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_LIVE_TRADING: process.env.NEXT_PUBLIC_LIVE_TRADING,
});

export function getServerEnv() {
  const parsed = serverSchema.parse(process.env);
  if (process.env.NODE_ENV === "production" && parsed.DEMO_MODE) {
    throw new Error("DEMO_MODE must be false in production");
  }
  if (parsed.LIVE_TRADING && !parsed.LEGAL_APPROVAL_REFERENCE?.trim()) {
    throw new Error("LIVE_TRADING cannot be enabled without LEGAL_APPROVAL_REFERENCE");
  }
  return parsed;
}

export function isSupabaseConfigured() {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
