import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPaymentProvider } from "@/lib/payments/registry";
import { canUseZainCashCheckout } from "@/lib/payments/flags";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  if (String(order.fiat_currency).toUpperCase() !== "IQD" || order.country_code !== "IQ") {
    return NextResponse.json({ error: "zaincash_iraq_iqd_only" }, { status: 400 });
  }

  const amount = Number(order.total_amount ?? order.amount_fiat);
  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const provider = getPaymentProvider("zaincash");

  if (!canUseZainCashCheckout()) {
    const result = await provider.createPayment({
      orderId: order.id,
      orderReference: order.reference_number,
      amount,
      currency: "IQD",
      countryCode: "IQ",
      successUrl: `${appUrl}/api/payments/zaincash/callback?ok=1`,
      failureUrl: `${appUrl}/api/payments/zaincash/callback?ok=0`,
      idempotencyKey: `zc-${order.id}`,
    });
    return NextResponse.json({
      mode: "intake",
      requiresProof: true,
      instructions: result.instructions,
      message: result.message,
    });
  }

  const result = await provider.createPayment({
    orderId: order.id,
    orderReference: order.reference_number,
    amount,
    currency: "IQD",
    countryCode: "IQ",
    customerEmail: user.email || undefined,
    successUrl: `${appUrl}/api/payments/zaincash/callback?ok=1&order=${order.id}`,
    failureUrl: `${appUrl}/api/payments/zaincash/callback?ok=0&order=${order.id}`,
    idempotencyKey: `zc-${order.id}-${randomUUID()}`,
  });

  const service = createServiceClient();
  if (service && result.providerPaymentId) {
    await service.from("payment_attempts").insert({
      order_id: order.id,
      provider: "zaincash",
      idempotency_key: `zc-${result.providerPaymentId}`,
      provider_payment_id: result.providerPaymentId,
      status: result.status,
      amount,
      currency: "IQD",
      redirect_url: result.redirectUrl || null,
    });
    await service
      .from("orders")
      .update({
        status: "payment_pending",
        payment_provider: "zaincash",
        provider_payment_id: result.providerPaymentId,
        provider_payment_status: result.status,
      })
      .eq("id", order.id);
  }

  return NextResponse.json(result);
}
