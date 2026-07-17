import { Building2, ShieldCheck, Sparkles } from "lucide-react";

export function PortalArtwork({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";

  return (
    <div className="portalArtwork" aria-label={ar ? "بوابة Gulf Gate المعمارية" : "Gulf Gate architectural portal"}>
      <div className="portalGlow" aria-hidden="true" />
      <div className="portalRings" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="portalArch" aria-hidden="true">
        <div className="portalArchInner">
          <div className="portalDoor">
            <span>GG</span>
          </div>
        </div>
      </div>
      <div className="portalPlinth" aria-hidden="true"><i /><i /><i /></div>
      <div className="portalReflection" aria-hidden="true" />
      <div className="portalMicroCards">
        <article>
          <ShieldCheck size={17} />
          <span><b>{ar ? "تحكم وأمان" : "Controlled security"}</b><small>{ar ? "صلاحيات ومسارات موثقة" : "Roles and traceable flows"}</small></span>
        </article>
        <article>
          <Building2 size={17} />
          <span><b>{ar ? "بنية مؤسسية" : "Operational structure"}</b><small>{ar ? "طلبات ومراجعات واضحة" : "Clear requests and reviews"}</small></span>
        </article>
        <article>
          <Sparkles size={17} />
          <span><b>{ar ? "تجربة راقية" : "Premium experience"}</b><small>{ar ? "عربي وإنجليزي" : "Arabic and English"}</small></span>
        </article>
      </div>
    </div>
  );
}
