"use client";

import { useParams } from "next/navigation";

export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const ar = params?.locale !== "en";
  return (
    <div className="shell sectionBlock">
      <section className="panel dashboardErrorPanel">
        <h1>{ar ? "تعذر عرض الصفحة" : "Page unavailable"}</h1>
        <p>{ar ? "تعذر تحميل بيانات الصفحة مؤقتاً. حاول مرة أخرى." : "This page could not be loaded temporarily. Please try again."}</p>
        <button className="primaryButton" type="button" onClick={() => reset()}>{ar ? "إعادة المحاولة" : "Retry"}</button>
      </section>
    </div>
  );
}
