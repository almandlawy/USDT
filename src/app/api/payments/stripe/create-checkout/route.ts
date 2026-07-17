import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/registry";
import { canUseStripeCheckout } from "@/lib/payments/flags";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!canUseStripeCheckout()) {
    return NextResponse.json(
      {
        error: "stripe_unavailable",
        message: "Card payment is not currently available for this type of order.",
        message_ar: "الدفع بالبطاقة غير متاح حالياً لهذا النوع من الطلبات.",
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "order_required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("id,reference_number,user_id,total_amount,amount_fiat,fiat_currency,country_code,status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const amount = Number(order.total_amount ?? order.amount_fiat);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const provider = getPaymentProvider("stripe");
  const result = await provider.createPayment({
    orderId: order.id,
    orderReference: order.reference_number,
    amount,
    currency: String(order.fiat_currency),
    countryCode: String(order.country_code || "OTHER"),
    customerEmail: user.email || undefined,
    successUrl: `${appUrl}/api/payments/stripe/create-checkout?ok=1&order=${order.id}`,
    failureUrl: `${appUrl}/api/payments/stripe/create-checkout?ok=0&order=${order.id}`,
    idempotencyKey: `stripe-${order.id}-${randomUUID()}`,
  });

  if (result.status === "failed" || !result.redirectUrl) {
    return NextResponse.json({ error: "stripe_unavailable", message: result.message }, { status: 403 });
  }

  const service = createServiceClient();
  if (service) {
    await service.from("payment_attempts").insert({
      order_id: order.id,
      provider: "stripe",
      idempotency_key: `stripe-session-${result.providerPaymentId}`,
      provider_payment_id: result.providerPaymentId,
      status: "redirected",
      amount,
      currency: order.fiat_currency,
      redirect_url: result.redirectUrl,
    });
    await service
      .from("orders")
      .update({
        status: "payment_pending",
        payment_provider: "stripe",
        provider_payment_id: result.providerPaymentId,
        provider_payment_status: "redirected",
      })
      .eq("id", order.id);
  }

  return NextResponse.json({ redirectUrl: result.redirectUrl, providerPaymentId: result.providerPaymentId });
}

export async function GET(request: Request) {
  // success_url is never proof of payment — send customer to order tracking.
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (orderId) {
    return NextResponse.redirect(`${appUrl}/ar/dashboard/orders/${orderId}?payment=pending_review`);
  }
  return NextResponse.redirect(`${appUrl}/ar/dashboard?payment=pending_review`);
}
