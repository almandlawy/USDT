import Link from "next/link";

export function Logo({ locale = "ar", compact = false }: { locale?: string; compact?: boolean }) {
  return (
    <Link className="brand" href={`/${locale}`} aria-label="Gulf Gate home">
      <svg className="brandLogo" viewBox="0 0 58 58" aria-hidden="true">
        <defs><linearGradient id="gold" x1="0" x2="1"><stop stopColor="#f7df9a"/><stop offset=".48" stopColor="#b78932"/><stop offset="1" stopColor="#f1ca6b"/></linearGradient></defs>
        <path d="M29 4 51 16v26L29 54 7 42V16L29 4Z" fill="none" stroke="url(#gold)" strokeWidth="2"/>
        <path d="M39 21.5c-2.6-3-5.9-4.5-10-4.5-7.1 0-12 5-12 12s4.9 12 12 12c3.5 0 6.4-.9 8.8-2.7V29H28v5h4.3v1.2c-.9.5-2 .8-3.3.8-4.1 0-6.8-2.8-6.8-7s2.7-7 6.8-7c2.6 0 4.6.9 6.3 2.8l3.7-3.3Z" fill="url(#gold)"/>
        <path d="M39.5 18.5 43 22l-3.5 3.5" fill="none" stroke="#29d8ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {!compact && <span><strong>GULF GATE</strong><small>DIGITAL ASSET OPERATIONS</small></span>}
    </Link>
  );
}
