"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export function TurnstileField({ siteKey, locale }: { siteKey: string | null; locale: "ar" | "en" }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useId();

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      ref.current.innerHTML = "";
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "dark",
        language: locale === "ar" ? "ar" : "en",
      });
    };
    if (window.turnstile) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.turnstile = "true";
        script.onload = mount;
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", mount);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [siteKey, locale, widgetId]);

  if (!siteKey) {
    // Keys not provisioned yet — server skips verification until configured.
    return null;
  }

  return <div ref={ref} className="turnstileField" aria-label={locale === "ar" ? "التحقق الأمني" : "Security verification"} />;
}
