import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 16; // 128 bits

export function generateQuotePublicToken(): { token: string; hint: string; hash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    hint: token.slice(0, 4),
    hash: hashQuoteToken(token),
  };
}

export function hashQuoteToken(token: string): string {
  return createHash("sha256").update(`gg-quote:${token}`).digest("hex");
}

export function signQuoteToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url");
}

export function verifyQuoteTokenSignature(token: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(signQuoteToken(token, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Build public path only — never embed amount/PII in the URL. */
export function quoteLinkPath(locale: string, token: string): string {
  return `/${locale}/q/${token}`;
}

export function generatePaymentReference(year = new Date().getUTCFullYear()): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `GG-${year}-${suffix}`;
}

export function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}
