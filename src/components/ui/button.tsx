import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "text";

const classMap: Record<Variant, string> = {
  primary: "primaryButton",
  secondary: "secondaryButton",
  danger: "dangerButton",
  text: "textButton",
};

export function Button({
  variant = "primary",
  wide,
  loading,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  wide?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={`${classMap[variant]}${wide ? " wide" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="buttonSpinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
