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
        <img src="/brand/gulf-gate-symbol.svg" alt="" width={42} height={42} className="brandLogo" />
        <span className="srOnly">Gulf Gate</span>
      </Link>
    );
  }

  const src = variant === "light" ? "/brand/gulf-gate-logo-light.svg" : "/brand/gulf-gate-logo-dark.svg";
  return (
    <Link className={`brand brand-${variant}`} href={`/${locale}`} aria-label="Gulf Gate home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Gulf Gate — Digital Asset Operations" width={240} height={45} className="brandMark" />
    </Link>
  );
}

/** Symbol-only architectural mark for compact product placements. */
export function BrandSymbol({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/gulf-gate-symbol.svg"
      alt=""
      width={size}
      height={size}
      className="brandLogo"
    />
  );
}
