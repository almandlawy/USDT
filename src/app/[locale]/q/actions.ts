"use server";

import { hashQuoteToken, generatePaymentReference } from "@/lib/quote-links/token";
import { validateWalletAddress, walletsMatch } from "@/lib/wallet/validate";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function acceptQuoteLinkAction(
  locale: string,
  token: string,
  formData: FormData,
): Promise<{ error?: string; reference?: string }> {
  const ar = locale === "ar";
  if (!isSupabaseConfigured()) {
    return { error: ar ? "قاعدة البيانات غير مهيأة." : "Database is not configured." };
  }

  const service = createServiceClient();
  if (!service) {
    return { error: ar ? "خدمة غير متاحة." : "Service unavailable." };
  }

  const quoteId = String(formData.get("quoteId") || "");
  const network = String(formData.get("network") || "") as "TRC20" | "ERC20" | "BEP20";
  const walletAddress = String(formData.get("walletAddress") || "");
  const walletConfirm = String(formData.get("walletAddressConfirm") || "");
  const paymentMethodCode = String(formData.get("paymentMethodCode") || "");
  const customerName = String(formData.get("customerName") || "").trim();
  const customerEmail = String(formData.get("customerEmail") || "").trim();
  const customerPhone = String(formData.get("customerPhone") || "").trim();
  const termsAccepted = formData.get("termsAccepted") === "on";

  if (!termsAccepted) {
    return { error: ar ? "يجب الموافقة على الشروط." : "Terms must be accepted." };
  }
  if (!quoteId || !paymentMethodCode || !customerName || !customerEmail) {
    return { error: ar ? "بيانات ناقصة." : "Missing required fields." };
  }

  const tokenHash = hashQuoteToken(token);
  const { data: quote } = await service
    .from("quote_links")
    .select("*")
    .eq("id", quoteId)
    .eq("public_token_hash", tokenHash)
    .maybeSingle();

  if (!quote) return { error: ar ? "الرابط غير صالح." : "Invalid quote link." };
  if (quote.status !== "active") return { error: ar ? "الرابط غير نشط." : "Quote link is not active." };
  if (new Date(quote.expires_at).getTime() < Date.now()) {
    await service.from("quote_links").update({ status: "expired" }).eq("id", quote.id);
    return { error: ar ? "انتهت صلاحية الرابط." : "Quote link expired." };
  }
  if (new Date(quote.rate_expires_at).getTime() < Date.now()) {
    return { error: ar ? "انتهى تثبيت السعر — اطلب رابطاً جديداً." : "Rate lock expired — request a new link." };
  }
  if (quote.used_count >= quote.max_uses) {
    return { error: ar ? "تم استهلاك الرابط." : "Quote link exhausted." };
  }

  if (quote.allowed_payment_methods?.length && !quote.allowed_payment_methods.includes(paymentMethodCode)) {
    return { error: ar ? "وسيلة الدفع غير مسموحة لهذا الرابط." : "Payment method not allowed for this link." };
  }

  let wallet = "";
  if (quote.wallet_mode === "customer_entered") {
    const validated = validateWalletAddress(network, walletAddress);
    if (!validated.ok) {
      return { error: ar ? "عنوان المحفظة غير صالح لهذه الشبكة." : "Wallet address is invalid for this network." };
    }
    if (!walletsMatch(walletAddress, walletConfirm, network)) {
      return { error: ar ? "عنوانا المحفظة غير متطابقين." : "Wallet addresses do not match." };
    }
    wallet = validated.normalized;
  } else if (!quote.fixed_wallet_address_encrypted) {
    return { error: ar ? "المحفظة الثابتة غير مهيأة." : "Fixed wallet is not configured." };
  } else {
    wallet = String(quote.fixed_wallet_address_encrypted);
  }

  const paymentReference = generatePaymentReference();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextUse = quote.used_count + 1;
  const exhausted = quote.single_use || nextUse >= quote.max_uses;

  if (!user) {
    await service.from("quote_link_events").insert({
      quote_link_id: quote.id,
      event_type: "accepted_pending_account",
      metadata: {
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        payment_method_code: paymentMethodCode,
        payment_reference: paymentReference,
        wallet_network: network,
        // Never store seed/private key; wallet address only for ops follow-up.
        wallet_address: wallet,
        fiat_amount: quote.fiat_amount,
        usdt_amount: quote.usdt_amount,
        fiat_currency: quote.fiat_currency,
      },
    });
    await service
      .from("quote_links")
      .update({
        used_count: nextUse,
        status: exhausted ? "exhausted" : "active",
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
      })
      .eq("id", quote.id);

    return { reference: paymentReference };
  }

  const { data: order, error } = await service
    .from("orders")
    .insert({
      user_id: user.id,
      order_type: "buy",
      status: "awaiting_payment",
      fiat_currency: quote.fiat_currency,
      network: quote.network,
      wallet_address: wallet,
      amount_fiat: quote.fiat_amount,
      amount_usdt: quote.usdt_amount,
      quote_rate: quote.customer_rate,
      fee_amount: quote.fee_amount,
      total_amount: quote.total_amount,
      quote_expires_at: quote.rate_expires_at,
      country_code: quote.country_code,
      quote_link_id: quote.id,
      payment_reference: paymentReference,
      payment_provider: paymentMethodCode,
      customer_note: `Quote link intake. Contact: ${customerName} / ${customerEmail} / ${customerPhone || "n/a"}`,
      is_demo: true,
      quote_status: "accepted",
      wallet_confirmed_at: new Date().toISOString(),
    })
    .select("id,reference_number")
    .maybeSingle();

  if (error || !order) {
    return { error: ar ? "تعذر إنشاء الطلب." : "Could not create order." };
  }

  await service.from("quote_rate_locks").insert({
    quote_link_id: quote.id,
    order_id: order.id,
    market_rate: quote.market_rate,
    spread_bps: quote.spread_bps,
    provider_fee: 0,
    service_fee: quote.fee_amount,
    customer_rate: quote.customer_rate,
    fiat_currency: quote.fiat_currency,
    expires_at: quote.rate_expires_at,
    status: "consumed",
  });

  await service
    .from("quote_links")
    .update({
      used_count: nextUse,
      status: exhausted ? "exhausted" : "active",
      customer_id: user.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
    })
    .eq("id", quote.id);

  await service.from("quote_link_events").insert({
    quote_link_id: quote.id,
    event_type: "order_created",
    actor_id: user.id,
    metadata: { order_id: order.id, payment_method_code: paymentMethodCode },
  });

  return { reference: order.reference_number || paymentReference };
}
