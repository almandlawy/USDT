export function StatusBadge({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "success" | "warning" | "danger" | "neutral" }) {
  return <span className={`statusBadge ${tone}`}>{children}</span>;
}
