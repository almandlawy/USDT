import { describe, expect, it } from "vitest";
import { canTransition } from "./order-state";

describe("pre-launch order state guard", () => {
  it("allows request review workflow", () => {
    expect(canTransition("under_review", "approved", false)).toBe(true);
  });

  it("blocks processing while live trading is disabled", () => {
    expect(canTransition("approved", "processing", false)).toBe(false);
  });

  it("allows processing only after activation", () => {
    expect(canTransition("approved", "processing", true)).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("draft", "completed", true)).toBe(false);
  });
});
