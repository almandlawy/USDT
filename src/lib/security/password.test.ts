import { describe, expect, it } from "vitest";
import { evaluatePassword } from "./password";

describe("password strength", () => {
  it("rejects short or common passwords", () => {
    expect(evaluatePassword("Short1!").ok).toBe(false);
    expect(evaluatePassword("password123!").ok).toBe(false);
  });

  it("accepts a strong password", () => {
    const result = evaluatePassword("GulfGate#Ready2026");
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });
});
