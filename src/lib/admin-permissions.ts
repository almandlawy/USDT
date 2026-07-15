import type { StaffRole } from "@/lib/constants";

/** Section slugs under /admin plus hub pages. */
export type AdminSection =
  | ""
  | "intelligence"
  | "ops"
  | "matching"
  | "customers"
  | "kyc"
  | "buy-orders"
  | "sell-orders"
  | "p2p"
  | "proofs"
  | "payment-methods"
  | "rates"
  | "fees"
  | "limits"
  | "wallets"
  | "compliance"
  | "disputes"
  | "support"
  | "notifications"
  | "staff"
  | "roles"
  | "audit"
  | "legal"
  | "settings"
  | "feature-flags";

const ALL: StaffRole[] = ["super_admin", "operations", "compliance", "finance", "support", "reviewer"];

/**
 * Least-privilege matrix enforced in layout/page load AND server actions.
 * UI hiding alone is never the security boundary.
 */
export const ADMIN_SECTION_ROLES: Record<AdminSection, StaffRole[]> = {
  "": ALL,
  intelligence: ["super_admin", "compliance", "operations"],
  ops: ["super_admin", "operations", "compliance", "finance", "reviewer", "support"],
  matching: ["super_admin", "operations", "reviewer"],
  customers: ["super_admin", "operations", "compliance", "support", "reviewer"],
  kyc: ["super_admin", "compliance", "reviewer"],
  "buy-orders": ["super_admin", "operations", "compliance", "finance", "reviewer"],
  "sell-orders": ["super_admin", "operations", "compliance", "finance", "reviewer"],
  p2p: ["super_admin", "operations", "compliance", "finance", "reviewer"],
  proofs: ["super_admin", "operations", "finance", "reviewer"],
  "payment-methods": ["super_admin", "finance"],
  rates: ["super_admin", "finance"],
  fees: ["super_admin", "finance"],
  limits: ["super_admin", "finance", "compliance"],
  wallets: ["super_admin", "finance"],
  compliance: ["super_admin", "compliance"],
  disputes: ["super_admin", "operations", "compliance", "support"],
  support: ["super_admin", "support", "operations"],
  notifications: ["super_admin", "operations", "support"],
  staff: ["super_admin"],
  roles: ["super_admin"],
  audit: ["super_admin", "compliance"],
  legal: ["super_admin", "compliance"],
  settings: ["super_admin"],
  "feature-flags": ["super_admin"],
};

export function canAccessAdminSection(roles: StaffRole[], section: AdminSection): boolean {
  const allowed = ADMIN_SECTION_ROLES[section] || ["super_admin"];
  return roles.some((role) => allowed.includes(role));
}

export function adminSectionsForRoles(roles: StaffRole[]): AdminSection[] {
  return (Object.keys(ADMIN_SECTION_ROLES) as AdminSection[]).filter((section) =>
    canAccessAdminSection(roles, section),
  );
}

/** Map shell nav slug index to permission section. */
export function sectionFromAdminSlug(slug: string): AdminSection {
  if (!slug) return "";
  if ((ADMIN_SECTION_ROLES as Record<string, StaffRole[]>)[slug]) return slug as AdminSection;
  return "";
}
