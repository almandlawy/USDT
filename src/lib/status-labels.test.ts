import { describe, expect, it } from "vitest";
import { formatFiatAmount, orderTypeLabel, systemStatusLabel } from "./status-labels";

describe("status labels", () => {
  it("translates system statuses without exposing raw keys when known", () => {
    expect(systemStatusLabel("under_review", "ar")).toBe("قيد المراجعة");
    expect(systemStatusLabel("waiting_staff", "en")).toBe("Waiting on support");
    expect(systemStatusLabel(null, "ar")).toBe("لم يبدأ");
  });

  it("labels order types and formats fiat amounts", () => {
    expect(orderTypeLabel("buy", "ar")).toBe("شراء");
    expect(formatFiatAmount(1250.5, "USD", "en")).toContain("USD");
  });
});
