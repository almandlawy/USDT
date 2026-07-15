export function ClayAccountIcon() {
  return (
    <span className="clayIcon clayAccount" aria-hidden>
      <span className="claySheen" />
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M18 44c0-8 6.5-14 14.5-14S47 36 47 44" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="32.5" cy="22" r="9" stroke="currentColor" strokeWidth="4.5" />
        <path d="M14 50h37" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ClayVerifyIcon() {
  return (
    <span className="clayIcon clayVerify" aria-hidden>
      <span className="claySheen" />
      <svg viewBox="0 0 64 64" fill="none">
        <path
          d="M32 10l7.2 3.2 7.8.4 3.8 6.8 5.4 5.6-1.4 7.7 3 7.2-5.2 5.8-3.4 7-7.8.8L32 56l-8.4-1.5-7.8-.8-3.4-7-5.2-5.8 3-7.2-1.4-7.7 5.4-5.6 3.8-6.8 7.8-.4L32 10Z"
          fill="currentColor"
          opacity=".22"
        />
        <path
          d="M32 12l6.4 2.8 7 .4 3.4 6.1 4.8 5-1.2 6.9 2.7 6.4-4.6 5.1-3 6.2-7 .7L32 54l-7.5-1.4-7-.7-3-6.2-4.6-5.1 2.7-6.4-1.2-6.9 4.8-5 3.4-6.1 7-.4L32 12Z"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M23 32.5 29.2 38.5 42 24.5" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function ClayRequestIcon() {
  return (
    <span className="clayIcon clayRequest" aria-hidden>
      <span className="claySheen" />
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="14" y="12" width="36" height="42" rx="10" fill="currentColor" opacity=".2" />
        <rect x="14" y="12" width="36" height="42" rx="10" stroke="currentColor" strokeWidth="3.4" />
        <path d="M23 25h18M23 33h14M23 41h10" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="42" cy="44" r="9" fill="#04160f" stroke="currentColor" strokeWidth="3" />
        <path d="M39 44.2 41.2 46.3 45.5 41.5" stroke="#7affa1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
