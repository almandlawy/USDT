import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { generateCountryPaymentReference, hashPayload } from "@/lib/quote-links/token";

export interface CreateSignedInstructionsInput {
  orderId: string;
  userId: string;
  countryCode: string;
  paymentMethodCode: string;
  amount: number;
  currencyCode: string;
  methodLabelAr: string;
  methodLabelEn: string;
  /** Masked payee only — never full admin secret blob to client logs */
  payeeMasked: string | null;
  instructionsAr: string;
  instructionsEn: string;
  ttlSeconds?: number;
}

export interface SignedPaymentInstructions {
  paymentReference: string;
  amount: number;
  currencyCode: string;
  methodCode: string;
  methodLabelAr: string;
  methodLabelEn: string;
  instructionsAr: string;
  instructionsEn: string;
  payeeMasked: string | null;
  expiresAt: string;
  signature: string;
}

function signingSecret(): string {
  const secret = process.env.SECURITY_HASH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    // Deterministic local fallback for unsigned envs — production env.ts requires real secret.
    return "local-dev-payment-instructions-secret-min-32";
  }
  return secret;
}

export function buildSignedPaymentInstructions(input: CreateSignedInstructionsInput): SignedPaymentInstructions {
  const ttl = Math.min(Math.max(input.ttlSeconds ?? 3600, 300), 86_400);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  const paymentReference = generateCountryPaymentReference(input.countryCode);
  const payload = [
    input.orderId,
    input.userId,
    input.countryCode,
    input.paymentMethodCode,
    String(input.amount),
    input.currencyCode,
    paymentReference,
    expiresAt,
  ].join("|");
  const signature = createHmac("sha256", signingSecret()).update(payload).digest("hex");

  const baseAr =
    input.instructionsAr ||
    `ادفع عبر ${input.methodLabelAr}. المبلغ ${input.amount} ${input.currencyCode}. اكتب المرجع ${paymentReference} في التحويل ثم ارفع الإثبات.`;
  const baseEn =
    input.instructionsEn ||
    `Pay via ${input.methodLabelEn}. Amount ${input.amount} ${input.currencyCode}. Include reference ${paymentReference} then upload proof.`;

  return {
    paymentReference,
    amount: input.amount,
    currencyCode: input.currencyCode,
    methodCode: input.paymentMethodCode,
    methodLabelAr: input.methodLabelAr,
    methodLabelEn: input.methodLabelEn,
    instructionsAr: baseAr,
    instructionsEn: baseEn,
    payeeMasked: input.payeeMasked,
    expiresAt,
    signature,
  };
}

export function verifyInstructionSignature(parts: {
  orderId: string;
  userId: string;
  countryCode: string;
  paymentMethodCode: string;
  amount: number;
  currencyCode: string;
  paymentReference: string;
  expiresAt: string;
  signature: string;
}): boolean {
  if (new Date(parts.expiresAt).getTime() < Date.now()) return false;
  const payload = [
    parts.orderId,
    parts.userId,
    parts.countryCode,
    parts.paymentMethodCode,
    String(parts.amount),
    parts.currencyCode,
    parts.paymentReference,
    parts.expiresAt,
  ].join("|");
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  return expected === parts.signature;
}

export function encryptAccountPayload(plaintext: string): string {
  // Application-level envelope: HMAC-bound opaque blob (replace with KMS in production).
  const nonce = randomBytes(8).toString("hex");
  const mac = createHmac("sha256", signingSecret()).update(`${nonce}:${plaintext}`).digest("hex");
  return `v1:${nonce}:${Buffer.from(plaintext, "utf8").toString("base64url")}:${mac.slice(0, 32)}`;
}

export function decryptAccountPayload(blob: string): string | null {
  const [version, nonce, b64, macPrefix] = blob.split(":");
  if (version !== "v1" || !nonce || !b64 || !macPrefix) return null;
  const plaintext = Buffer.from(b64, "base64url").toString("utf8");
  const mac = createHmac("sha256", signingSecret()).update(`${nonce}:${plaintext}`).digest("hex");
  if (!mac.startsWith(macPrefix)) return null;
  return plaintext;
}

export function instructionPayloadHash(instructions: SignedPaymentInstructions): string {
  return hashPayload(JSON.stringify(instructions));
}
