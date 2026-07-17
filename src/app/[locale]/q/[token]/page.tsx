import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { QuoteAcceptForm } from "@/components/quote/quote-accept-form";
import { isLocale } from "@/lib/i18n/dictionaries";
import { hashQuoteToken } from "@/lib/quote-links/token";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { fallbackMatrixForCountry, resolvePaymentMethodsForCountry } from "@/lib/payments/matrix";
import { WALLET_IRREVERSIBLE_WARNING } from "@/lib/wallet/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QuoteRow = {
  id: string;
  country_code: string;
  fiat_currency: string;
  fiat_amount: number;
  usdt_amount: number;
  network: string;
  customer_rate: number;
  fee_amount: number;
  total_amount: number;
  expires_at: string;
  rate_expires_at: string;
  status: string;
  single_use: boolean;
  used_count: number;
  max_uses: number;
  wallet_mode: string;
  allowed_payment_methods: string[] | null;
  token_hint?: string;
};

async function loadQuoteAccess(token: string): Promise<{
  accessResult: "ok" | "not_found" | "expired" | "revoked" | "exhausted";
  quote: QuoteRow | null;
}> {
  if (!isSupabaseConfigured()) return { accessResult: "not_found", quote: null };
  const service = createServiceClient();
  if (!service) return { accessResult: "not_found", quote: null };

  const tokenHash = hashQuoteToken(token);
  const { data } = await service
    .from("quote_links")
    .select(
      "id,country_code,fiat_currency,fiat_amount,usdt_amount,network,customer_rate,fee_amount,total_amount,expires_at,rate_expires_at,status,single_use,used_count,max_uses,wallet_mode,allowed_payment_methods,token_hint",
    )
    .eq("public_token_hash", tokenHash)
    .maybeSingle();

  let accessResult: "ok" | "not_found" | "expired" | "revoked" | "exhausted" = "not_found";
  let quote: QuoteRow | null = null;
  const nowMs = Date.now();

  if (!data) {
    accessResult = "not_found";
  } else if (data.status === "revoked") {
    accessResult = "revoked";
  } else if (data.status === "expired" || new Date(data.expires_at).getTime() < nowMs) {
    accessResult = "expired";
  } else if (data.used_count >= data.max_uses) {
    accessResult = "exhausted";
  } else {
    accessResult = "ok";
    quote = data as QuoteRow;
  }

  await service.from("quote_link_access_logs").insert({
    quote_link_id: data?.id || null,
    token_hint: data?.token_hint || token.slice(0, 4),
    result: accessResult,
  });

  return { accessResult, quote };
}

export default async function QuoteLinkPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: rawLocale, token } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const ar = locale === "ar";

  if (!token || token.length < 16) notFound();

  const { accessResult, quote } = await loadQuoteAccess(token);

  const methods = quote
    ? resolvePaymentMethodsForCountry(fallbackMatrixForCountry(quote.country_code), quote.country_code).filter((m) => {
        if (!quote.allowed_payment_methods?.length) return m.available || m.displayMode === "disabled";
        return quote.allowed_payment_methods.includes(m.code);
      })
    : [];

  return (
    <>
      <PrelaunchBanner locale={locale} />
      <main className="quoteLinkPage shell">
        <header className="quoteLinkHeader">
          <Logo locale={locale} />
          <p className="quoteSecureNote">
            {ar
              ? "رابط Gulf Gate الآمن — مشفّر وله مدة صلاحية. لا تشارك الرابط علناً."
              : "Gulf Gate secure quote link — tokenised and time-limited. Do not share publicly."}
          </p>
        </header>

        {accessResult !== "ok" || !quote ? (
          <section className="quoteLinkError">
            <h1>{ar ? "الرابط غير متاح" : "Link unavailable"}</h1>
            <p>
              {accessResult === "expired"
                ? ar
                  ? "انتهت صلاحية هذا الرابط."
                  : "This quote link has expired."
                : accessResult === "revoked"
                  ? ar
                    ? "تم إلغاء هذا الرابط."
                    : "This quote link was revoked."
                  : accessResult === "exhausted"
                    ? ar
                      ? "تم استخدام هذا الرابط بالكامل."
                      : "This quote link has no remaining uses."
                    : ar
                      ? "الرمز غير صالح أو غير موجود."
                      : "Invalid or unknown token."}
            </p>
            <Link className="primaryButton" href={`/${locale}`}>
              {ar ? "العودة للرئيسية" : "Back to home"}
            </Link>
          </section>
        ) : (
          <section className="quoteLinkContent">
            <h1>{ar ? "عرض سعر آمن" : "Secure quote"}</h1>
            <p className="methodHint">
              {ar
                ? "تعليمات الدفع تظهر فقط بعد قبول العرض وإنشاء الطلب. لا تُعرض أرقام حسابات أو بيانات الشركة الإماراتية لعملاء العراق هنا."
                : "Payment instructions appear only after accepting the quote and creating the order. Iraq customers do not see UAE company or account details here."}
            </p>
            <dl className="quoteFacts">
              <div>
                <dt>{ar ? "الدولة" : "Country"}</dt>
                <dd>{quote.country_code}</dd>
              </div>
              <div>
                <dt>{ar ? "المبلغ" : "Amount"}</dt>
                <dd>
                  {quote.fiat_amount} {quote.fiat_currency}
                </dd>
              </div>
              <div>
                <dt>{ar ? "كمية USDT" : "USDT amount"}</dt>
                <dd>{quote.usdt_amount}</dd>
              </div>
              <div>
                <dt>{ar ? "السعر للعميل" : "Customer rate"}</dt>
                <dd>{quote.customer_rate}</dd>
              </div>
              <div>
                <dt>{ar ? "الرسوم" : "Fees"}</dt>
                <dd>
                  {quote.fee_amount} {quote.fiat_currency}
                </dd>
              </div>
              <div>
                <dt>{ar ? "انتهاء تثبيت السعر" : "Rate lock expires"}</dt>
                <dd>{new Date(quote.rate_expires_at).toLocaleString(ar ? "ar-IQ" : "en-GB")}</dd>
              </div>
              <div>
                <dt>{ar ? "انتهاء الرابط" : "Link expires"}</dt>
                <dd>{new Date(quote.expires_at).toLocaleString(ar ? "ar-IQ" : "en-GB")}</dd>
              </div>
            </dl>

            <p className="walletWarning">{WALLET_IRREVERSIBLE_WARNING[locale]}</p>

            <QuoteAcceptForm
              locale={locale}
              token={token}
              quoteId={quote.id}
              network={quote.network as "TRC20" | "ERC20" | "BEP20"}
              walletMode={quote.wallet_mode}
              methods={methods.map((m) => ({
                code: m.code,
                label: locale === "ar" ? m.name_ar : m.name_en,
                available: m.available,
                disabledReason: m.disabledReason ? m.disabledReason[locale] : undefined,
              }))}
            />
          </section>
        )}
      </main>
    </>
  );
}
