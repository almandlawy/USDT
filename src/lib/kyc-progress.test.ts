import { describe, expect, it } from "vitest";
import { computeKycProgress } from "./kyc-progress";

describe("computeKycProgress", () => {
  it("starts at 0% when there is no case", () => {
    expect(computeKycProgress(null).percent).toBe(0);
    expect(computeKycProgress("not_started").percent).toBe(0);
  });

  it("marks an opened draft case as 25%", () => {
    expect(computeKycProgress("draft", 0).percent).toBe(25);
  });

  it("marks uploaded documents as 50%", () => {
    expect(computeKycProgress("draft", 2).percent).toBe(50);
    expect(computeKycProgress("submitted", 0).percent).toBe(50);
  });

  it("marks under review as 75% and approved as 100%", () => {
    expect(computeKycProgress("under_review").percent).toBe(75);
    expect(computeKycProgress("approved").percent).toBe(100);
  });

  it("hides a success percentage for rejected cases", () => {
    const progress = computeKycProgress("rejected", 3);
    expect(progress.showPercent).toBe(false);
    expect(progress.rejected).toBe(true);
  });
});
