"use client";

import { useState, useTransition } from "react";
import { acceptQuoteLinkAction } from "@/app/[locale]/q/actions";
import { WALLET_IRREVERSIBLE_WARNING } from "@/lib/wallet/validate";

export function QuoteAcceptForm({
  locale,
  token,
  quoteId,
  network,
  walletMode,
  methods,
}: {
  locale: "ar" | "en";
  token: string;
  quoteId: string;
  network: "TRC20" | "ERC20" | "BEP20";
  walletMode: string;
  methods: { code: string; label: string; available: boolean; disabledReason?: string }[];
}) {
  const ar = locale === "ar";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await acceptQuoteLinkAction(locale, token, formData);
      if (result.error) setError(result.error);
      if (result.reference) setReference(result.reference);
    });
  }

  if (reference) {
    return (
      <div className="quoteSuccess">
        <h2>{ar ? "تم استلام طلبك" : "Request received"}</h2>
        <p>
          {ar ? "رقم المتابعة:" : "Tracking reference:"} <strong>{reference}</strong>
        </p>
        <p>
          {ar
            ? "الحالة: بانتظار الدفع/المراجعة. لن يتم إرسال USDT تلقائياً."
            : "Status: awaiting payment/review. USDT will not be sent automatically."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="quoteAcceptForm">
      <input type="hidden" name="quoteId" value={quoteId} />
      <fieldset>
        <legend>{ar ? "الشبكة" : "Network"}</legend>
        <input name="network" value={network} readOnly className="fieldInput" />
      </fieldset>

      {walletMode === "customer_entered" ? (
        <>
          <label>
            {ar ? "عنوان المحفظة" : "Wallet address"}
            <input name="walletAddress" className="fieldInput" required autoComplete="off" spellCheck={false} />
          </label>
          <label>
            {ar ? "أعد إدخال عنوان المحفظة" : "Confirm wallet address"}
            <input name="walletAddressConfirm" className="fieldInput" required autoComplete="off" spellCheck={false} />
          </label>
        </>
      ) : (
        <p className="methodHint">{ar ? "المحفظة محددة مسبقاً من الإدارة." : "Wallet is fixed by the admin."}</p>
      )}

      <fieldset>
        <legend>{ar ? "وسيلة الدفع" : "Payment method"}</legend>
        {methods.map((method) => (
          <label key={method.code} className={`methodChoice${!method.available ? " isDisabled" : ""}`}>
            <input type="radio" name="paymentMethodCode" value={method.code} disabled={!method.available} required={method.available} />
            <span>
              {method.label}
              {!method.available && method.disabledReason ? ` — ${method.disabledReason}` : ""}
            </span>
          </label>
        ))}
      </fieldset>

      <label>
        {ar ? "الاسم" : "Name"}
        <input name="customerName" className="fieldInput" required maxLength={120} />
      </label>
      <label>
        Email
        <input name="customerEmail" type="email" className="fieldInput" required maxLength={254} />
      </label>
      <label>
        {ar ? "الهاتف" : "Phone"}
        <input name="customerPhone" className="fieldInput" maxLength={32} />
      </label>

      <label className="checkRow">
        <input type="checkbox" name="termsAccepted" value="on" required />
        <span>{ar ? "أوافق على الشروط وإفصاح المخاطر" : "I agree to the terms and risk disclosure"}</span>
      </label>

      <p className="walletWarning">{WALLET_IRREVERSIBLE_WARNING[locale]}</p>

      {error ? <p className="formError">{error}</p> : null}

      <button className="primaryButton" type="submit" disabled={pending}>
        {pending ? (ar ? "جارٍ الإرسال…" : "Submitting…") : ar ? "تأكيد الطلب" : "Confirm request"}
      </button>
    </form>
  );
}
