import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/registry";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const provider = getPaymentProvider("zaincash");
  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });

  let event;
  try {
    event = await provider.verifyWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_webhook";
    await service.from("payment_webhook_events").insert({
      provider: "zaincash",
      external_event_id: `invalid-${Date.now()}`,
      event_type: "signature_failed",
      payload_hash: "invalid",
      signature_valid: false,
      processing_status: "failed",
      error_code: message,
      attempts: 1,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: insertError } = await service.from("payment_webhook_events").insert({
    provider: "zaincash",
    external_event_id: event.externalEventId,
    event_type: event.eventType,
    payload_hash: event.payloadHash,
    signature_valid: true,
    processing_status: "processing",
    attempts: 1,
    order_id: event.orderId || null,
  });

  if (insertError?.code === "23505") {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (insertError) return NextResponse.json({ error: "ledger_failed" }, { status: 500 });

  try {
    let orderId = event.orderId;
    if (!orderId && event.orderReference) {
      const { data } = await service
        .from("orders")
        .select("id")
        .eq("reference_number", event.orderReference)
        .maybeSingle();
      orderId = data?.id;
    }

    if (event.status === "paid" && orderId) {
      await service.rpc("mark_payment_received_pending_review", {
        _order_id: orderId,
        _provider: "zaincash",
        _provider_payment_id: event.providerPaymentId || null,
        _note: `Zain Cash webhook ${event.eventType}`,
      });
    }

    await service
      .from("payment_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString(), order_id: orderId || null })
      .eq("provider", "zaincash")
      .eq("external_event_id", event.externalEventId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "processing_failed";
    await service
      .from("payment_webhook_events")
      .update({ processing_status: "failed", error_code: message })
      .eq("provider", "zaincash")
      .eq("external_event_id", event.externalEventId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
