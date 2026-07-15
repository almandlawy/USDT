"use client";

import { useParams } from "next/navigation";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const ar = params?.locale !== "en";
  return (
    <section className="panel dashboardErrorPanel">
      <h2>{ar ? "تعذر تحميل لوحة الإدارة" : "Could not load admin"}</h2>
      <p>{ar ? "تعذر تحميل البيانات مؤقتاً. حاول مرة أخرى." : "Data could not be loaded temporarily. Please try again."}</p>
      <button className="primaryButton" type="button" onClick={() => reset()}>{ar ? "إعادة المحاولة" : "Retry"}</button>
    </section>
  );
}
