import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  locale?: string;
  compact?: boolean;
  variant?: "dark" | "light";
};

export function Logo({ locale = "ar", compact = false, variant = "dark" }: LogoProps) {
  if (compact) {
    return (
      <Link className="brand brandCompact" href={`/${locale}`} aria-label="Gulf Gate home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/gulf-gate-symbol.svg" alt="" width={40} height={40} className="brandLogo" />
        <span className="srOnly">Gulf Gate</span>
      </Link>
    );
  }

  const src = variant === "light" ? "/brand/gulf-gate-logo-light.svg" : "/brand/gulf-gate-logo-dark.svg";
  return (
    <Link className="brand" href={`/${locale}`} aria-label="Gulf Gate home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Gulf Gate — Digital Asset Operations" width={220} height={40} className="brandMark" />
    </Link>
  );
}

/** Symbol-only mark for favicon-adjacent placements (emails, compact chrome). */
export function BrandSymbol({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/brand/gulf-gate-symbol.png"
      alt=""
      width={size}
      height={size}
      className="brandLogo"
      unoptimized
    />
  );
}
