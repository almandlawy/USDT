import { describe, expect, it } from "vitest";
import { adminSectionsForRoles, canAccessAdminSection } from "./admin-permissions";

describe("admin permission matrix", () => {
  it("allows finance on rates and blocks support from rates", () => {
    expect(canAccessAdminSection(["finance"], "rates")).toBe(true);
    expect(canAccessAdminSection(["support"], "rates")).toBe(false);
  });

  it("keeps settings and roles super-admin only", () => {
    expect(canAccessAdminSection(["operations"], "settings")).toBe(false);
    expect(canAccessAdminSection(["super_admin"], "roles")).toBe(true);
  });

  it("lists only permitted nav sections for a support agent", () => {
    const sections = adminSectionsForRoles(["support"]);
    expect(sections).toContain("support");
    expect(sections).toContain("ops");
    expect(sections).not.toContain("rates");
    expect(sections).not.toContain("wallets");
    expect(sections).not.toContain("feature-flags");
  });
});
