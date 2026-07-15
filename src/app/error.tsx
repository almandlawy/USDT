"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="shell sectionBlock">
      <section className="panel dashboardErrorPanel">
        <h1>Something went wrong</h1>
        <p>تعذر تحميل الصفحة مؤقتاً. حاول مرة أخرى.</p>
        <button className="primaryButton" type="button" onClick={() => reset()}>Retry / إعادة المحاولة</button>
      </section>
    </div>
  );
}
