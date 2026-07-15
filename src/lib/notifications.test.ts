import { describe, expect, it } from "vitest";
import { formatUnreadBadge } from "./notifications";

describe("formatUnreadBadge", () => {
  it("hides zero and negative counts", () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-1)).toBeNull();
    expect(formatUnreadBadge(null)).toBeNull();
  });

  it("caps large counts at 99+", () => {
    expect(formatUnreadBadge(3)).toBe("3");
    expect(formatUnreadBadge(99)).toBe("99");
    expect(formatUnreadBadge(120)).toBe("99+");
  });
});
