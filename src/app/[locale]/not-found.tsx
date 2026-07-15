import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="shell sectionBlock">
      <section className="panel dashboardErrorPanel">
        <h1>الصفحة غير موجودة / Page not found</h1>
        <p>الرابط غير صحيح أو لم يعد متاحاً. / This link is invalid or no longer available.</p>
        <div className="headingActions">
          <Link className="primaryButton" href="/ar">العربية</Link>
          <Link className="secondaryButton" href="/en">English</Link>
        </div>
      </section>
    </div>
  );
}
