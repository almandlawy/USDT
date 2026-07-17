import "server-only";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  RefundResult,
  VerifiedPaymentEvent,
} from "@/lib/payments/types";
import { canUseStripeCheckout } from "@/lib/payments/flags";
import { hashPayload } from "@/lib/quote-links/token";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe Checkout — honest USDT product metadata only.
 * Refuses real sessions unless STRIPE_ENABLED + STRIPE_CRYPTO_APPROVED + REAL_PAYMENTS_ENABLED.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!canUseStripeCheckout()) {
      return {
        provider: "stripe",
        status: "failed",
        requiresProof: false,
        message: "Card payment is not currently available for this type of order.",
      };
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      throw new Error("STRIPE_SECRET_KEY missing while Stripe checkout is enabled");
    }

    const unitAmount = Math.round(input.amount * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      throw new Error("Invalid Stripe amount");
    }

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", input.successUrl);
    params.set("cancel_url", input.failureUrl);
    params.set("client_reference_id", input.orderId);
    params.set("idempotency_key", input.idempotencyKey);
    if (input.customerEmail) params.set("customer_email", input.customerEmail);

    // Honest product naming — USDT purchase, never disguised as consulting.
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
    params.set("line_items[0][price_data][product_data][name]", "USDT purchase — Gulf Gate");
    params.set(
      "line_items[0][price_data][product_data][description]",
      `Digital asset (USDT) order ${input.orderReference}. Settlement after payment verification and human review.`,
    );

    params.set("metadata[order_id]", input.orderId);
    params.set("metadata[order_reference]", input.orderReference);
    params.set("metadata[country_code]", input.countryCode);
    params.set("metadata[product_type]", "usdt");
    params.set("metadata[asset]", "USDT");
    for (const [key, value] of Object.entries(input.metadata || {})) {
      params.set(`metadata[${key}]`, value);
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: params,
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error?.message || "Stripe checkout session failed");
    }

    return {
      provider: "stripe",
      status: "redirected",
      providerPaymentId: body.id,
      redirectUrl: body.url,
      requiresProof: false,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifiedPaymentEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET missing");

    const payload = await request.text();
    const signatureHeader = request.headers.get("stripe-signature") || "";
    if (!verifyStripeSignature(payload, signatureHeader, secret)) {
      throw new Error("INVALID_STRIPE_SIGNATURE");
    }

    const event = JSON.parse(payload) as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

    const obj = event.data.object;
    const metadata = (obj.metadata || {}) as Record<string, string>;
    const status = mapStripeEvent(event.type, obj);

    return {
      provider: "stripe",
      externalEventId: event.id,
      eventType: event.type,
      providerPaymentId: String(obj.id || obj.payment_intent || ""),
      orderId: metadata.order_id || (obj.client_reference_id as string | undefined),
      orderReference: metadata.order_reference,
      status,
      amount: typeof obj.amount_total === "number" ? obj.amount_total / 100 : undefined,
      currency: typeof obj.currency === "string" ? obj.currency.toUpperCase() : undefined,
      payloadHash: hashPayload(payload),
      rawType: event.type,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) throw new Error("STRIPE_SECRET_KEY missing");
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${providerPaymentId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message || "Stripe status failed");
    const paid = body.payment_status === "paid";
    return {
      providerPaymentId,
      status: paid ? "paid" : body.status === "expired" ? "expired" : "pending",
      amount: typeof body.amount_total === "number" ? body.amount_total / 100 : undefined,
      currency: typeof body.currency === "string" ? body.currency.toUpperCase() : undefined,
    };
  }

  async refundPayment(providerPaymentId: string, amount?: number): Promise<RefundResult> {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) throw new Error("STRIPE_SECRET_KEY missing");
    const params = new URLSearchParams();
    params.set("payment_intent", providerPaymentId);
    if (amount != null) params.set("amount", String(Math.round(amount * 100)));
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const body = await response.json();
    if (!response.ok) return { providerPaymentId, status: "failed" };
    return { providerPaymentId, status: "refunded", refundId: body.id };
  }
}

function mapStripeEvent(type: string, obj: Record<string, unknown>): VerifiedPaymentEvent["status"] {
  if (type === "checkout.session.completed" || type === "payment_intent.succeeded") {
    if (obj.payment_status === "paid" || obj.status === "succeeded") return "paid";
    return "pending";
  }
  if (type === "payment_intent.payment_failed") return "failed";
  if (type === "charge.refunded") return "refunded";
  if (type === "charge.dispute.created") return "under_review";
  return "pending";
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [k, v] = piece.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
