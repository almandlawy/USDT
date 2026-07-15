import { describe, expect, it } from "vitest";
import { orderStatusLabel, statusTone } from "./order-display";

describe("order display", () => {
  it("localizes operational statuses", () => {
    expect(orderStatusLabel("approved", "ar")).toBe("مقبول");
    expect(orderStatusLabel("proof_uploaded", "en")).toBe("Proof uploaded");
  });

  it("uses risk-aware tones", () => {
    expect(statusTone("compliance_hold")).toBe("warning");
    expect(statusTone("rejected")).toBe("danger");
  });
});
