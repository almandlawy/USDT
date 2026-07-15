"use client";

import { useParams } from "next/navigation";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const ar = params?.locale !== "en";
  return (
    <section className="panel dashboardErrorPanel">
      <h2>{ar ? "تعذر تحميل لوحة العميل" : "Could not load the client dashboard"}</h2>
      <p>{ar ? "تعذر تحميل بيانات الحساب مؤقتاً. حاول مرة أخرى." : "Account data could not be loaded temporarily. Please try again."}</p>
      <button className="primaryButton" type="button" onClick={() => reset()}>{ar ? "إعادة المحاولة" : "Retry"}</button>
    </section>
  );
}
