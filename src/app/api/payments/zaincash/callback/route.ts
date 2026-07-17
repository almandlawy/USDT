import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { ZainCashPaymentProvider } from "@/lib/payments/providers/zaincash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redirect callback is informational only.
 * Final payment state comes from the webhook (or inquiry), never from this redirect alone.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const token = url.searchParams.get("token") || url.searchParams.get("redirectToken") || "";
  const ok = url.searchParams.get("ok");

  if (token) {
    const provider = new ZainCashPaymentProvider();
    // Best-effort integrity check — does not mark paid.
    await provider.verifyRedirectToken(token).catch(() => ({ ok: false }));
  }

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const status = ok === "1" ? "redirect_ok_pending_webhook" : "redirect_failed_pending_webhook";
  if (orderId) {
    return NextResponse.redirect(`${appUrl}/ar/dashboard/orders/${orderId}?zaincash=${status}`);
  }
  return NextResponse.redirect(`${appUrl}/ar/dashboard?zaincash=${status}`);
}
