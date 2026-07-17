import "server-only";
import { randomUUID } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  RefundResult,
  VerifiedPaymentEvent,
} from "@/lib/payments/types";
import { canUseZainCashCheckout } from "@/lib/payments/flags";
import { hashPayload } from "@/lib/quote-links/token";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Zain Cash Merchant Payment Gateway adapter.
 * OAuth2 client credentials + server-side transaction create.
 * Webhook is the source of truth — redirect alone is never final.
 */
export class ZainCashPaymentProvider implements PaymentProvider {
  readonly id = "zaincash" as const;

  private baseUrl(): string {
    const configured = process.env.ZAINCASH_BASE_URL?.trim();
    if (configured) return configured.replace(/\/$/, "");
    const env = process.env.ZAINCASH_ENVIRONMENT === "production" ? "production" : "uat";
    // Official base URLs must be set via ZAINCASH_BASE_URL for the active environment.
    if (env === "production") {
      throw new Error("ZAINCASH_BASE_URL required for production environment");
    }
    throw new Error("ZAINCASH_BASE_URL required (do not hardcode UAT/production hosts in client code)");
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!canUseZainCashCheckout()) {
      return {
        provider: "zaincash",
        status: "under_review",
        requiresProof: true,
        message: "Zain Cash gateway is not enabled for live charges. Order can proceed with proof review.",
        instructions: {
          ar: "بوابة زين كاش غير مفعّلة للدفع المباشر حالياً. يمكن إكمال الطلب مع رفع إثبات عند الحاجة.",
          en: "Zain Cash live gateway is not enabled. The order can continue with proof upload when required.",
        },
      };
    }

    if (input.currency.toUpperCase() !== "IQD") {
      throw new Error("Zain Cash requires IQD amounts");
    }

    const token = await this.getAccessToken();
    const externalReference = randomUUID();
    const amountIqd = Math.round(input.amount);
    if (!Number.isFinite(amountIqd) || amountIqd <= 0) throw new Error("Invalid IQD amount");

    const body = {
      amount: amountIqd,
      currency: "IQD",
      serviceType: process.env.ZAINCASH_SERVICE_TYPE || "MERCHANT_PAYMENT",
      orderId: input.orderReference,
      externalReference,
      successUrl: input.successUrl,
      failureUrl: input.failureUrl,
      language: "ar",
      metadata: {
        order_id: input.orderId,
        country_code: input.countryCode,
        product_type: "usdt",
        asset: "USDT",
      },
    };

    const response = await fetch(`${this.baseUrl()}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
        ...(process.env.ZAINCASH_API_KEY ? { "x-api-key": process.env.ZAINCASH_API_KEY } : {}),
      },
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.message || json?.error || "Zain Cash create transaction failed");
    }

    return {
      provider: "zaincash",
      status: "redirected",
      providerPaymentId: String(json.transactionId || json.id || externalReference),
      redirectUrl: json.redirectUrl || json.paymentUrl,
      requiresProof: false,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifiedPaymentEvent> {
    const secret = process.env.ZAINCASH_WEBHOOK_SECRET?.trim();
    if (!secret) throw new Error("ZAINCASH_WEBHOOK_SECRET missing");
    const payload = await request.text();
    const signature = request.headers.get("x-zaincash-signature") || request.headers.get("x-signature") || "";
    if (!verifyHmacSha256(payload, signature, secret)) {
      throw new Error("INVALID_ZAINCASH_SIGNATURE");
    }

    const event = JSON.parse(payload) as Record<string, unknown>;
    const statusRaw = String(event.status || event.transactionStatus || "").toLowerCase();
    const status = mapZainStatus(statusRaw);

    return {
      provider: "zaincash",
      externalEventId: String(event.eventId || event.id || event.transactionId || hashPayload(payload)),
      eventType: String(event.eventType || event.type || "transaction.status"),
      providerPaymentId: String(event.transactionId || event.id || ""),
      orderId: String((event.metadata as Record<string, string> | undefined)?.order_id || event.orderId || ""),
      orderReference: String(event.orderId || event.merchantOrderId || ""),
      status,
      amount: typeof event.amount === "number" ? event.amount : undefined,
      currency: "IQD",
      payloadHash: hashPayload(payload),
      rawType: statusRaw,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl()}/transactions/${encodeURIComponent(providerPaymentId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(process.env.ZAINCASH_API_KEY ? { "x-api-key": process.env.ZAINCASH_API_KEY } : {}),
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || "Zain Cash inquiry failed");
    return {
      providerPaymentId,
      status: mapZainStatus(String(json.status || json.transactionStatus || "")),
      amount: typeof json.amount === "number" ? json.amount : undefined,
      currency: "IQD",
    };
  }

  async refundPayment(providerPaymentId: string, amount?: number): Promise<RefundResult> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl()}/transactions/${encodeURIComponent(providerPaymentId)}/reversal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(process.env.ZAINCASH_API_KEY ? { "x-api-key": process.env.ZAINCASH_API_KEY } : {}),
      },
      body: JSON.stringify({ amount }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return { providerPaymentId, status: "failed" };
    return { providerPaymentId, status: "refunded", refundId: String(json.reversalId || json.id || "") };
  }

  /** Verify redirect token — informational only; never final settlement proof. */
  async verifyRedirectToken(token: string): Promise<{ ok: boolean; transactionId?: string }> {
    const secret = process.env.ZAINCASH_WEBHOOK_SECRET?.trim() || process.env.ZAINCASH_CLIENT_SECRET?.trim();
    if (!secret || !token) return { ok: false };
    // Redirect tokens are provider-specific; treat as opaque HMAC integrity check when formatted as payload.sig
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return { ok: false };
    if (!verifyHmacSha256(payload, sig, secret)) return { ok: false };
    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { transactionId?: string };
      return { ok: true, transactionId: parsed.transactionId };
    } catch {
      return { ok: true };
    }
  }

  private async getAccessToken(): Promise<string> {
    const clientId = process.env.ZAINCASH_CLIENT_ID?.trim();
    const clientSecret = process.env.ZAINCASH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error("Zain Cash OAuth credentials missing");
    }
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    const response = await fetch(`${this.baseUrl()}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.access_token) {
      throw new Error(json?.error_description || json?.message || "Zain Cash OAuth failed");
    }
    return String(json.access_token);
  }
}

function mapZainStatus(raw: string): VerifiedPaymentEvent["status"] {
  const value = raw.toLowerCase();
  if (["paid", "success", "successful", "completed", "captured"].includes(value)) return "paid";
  if (["failed", "declined", "rejected"].includes(value)) return "failed";
  if (["expired", "timeout"].includes(value)) return "expired";
  if (["refunded", "reversed"].includes(value)) return "refunded";
  if (["auth", "authentication_required", "otp"].includes(value)) return "authentication_required";
  if (["redirected", "redirect"].includes(value)) return "redirected";
  if (["created", "initiated"].includes(value)) return "created";
  if (["review", "under_review"].includes(value)) return "under_review";
  return "pending";
}

function verifyHmacSha256(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature.replace(/^sha256=/i, ""));
    if (a.length !== b.length) {
      // try base64 form
      const expectedB64 = createHmac("sha256", secret).update(payload).digest("base64");
      const a2 = Buffer.from(expectedB64);
      const b2 = Buffer.from(signature);
      if (a2.length !== b2.length) return false;
      return timingSafeEqual(a2, b2);
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
