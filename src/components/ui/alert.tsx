import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const Icon = tone === "success" ? CircleCheck : tone === "info" ? Info : CircleAlert;
  const className = tone === "success" ? "formSuccess" : tone === "info" ? "formNoticeBox" : "formAlert";
  return (
    <div className={className} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>
      <Icon />
      <span>{children}</span>
    </div>
  );
}
