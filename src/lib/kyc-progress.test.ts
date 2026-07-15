import { describe, expect, it } from "vitest";
import { computeKycProgress } from "./kyc-progress";

describe("computeKycProgress", () => {
  it("starts at 0% when there is no case", () => {
    expect(computeKycProgress(null).percent).toBe(0);
    expect(computeKycProgress("not_started").percent).toBe(0);
  });

  it("marks an opened draft case without docs as 30%", () => {
    expect(computeKycProgress("draft", 0).percent).toBe(30);
  });

  it("marks identity upload as 50% and address as 65%", () => {
    expect(computeKycProgress("draft", 1, ["passport"]).percent).toBe(50);
    expect(computeKycProgress("draft", 2, ["passport", "proof_of_address"]).percent).toBe(65);
    expect(computeKycProgress("draft", 3, ["passport", "proof_of_address", "source_of_funds"]).percent).toBe(75);
  });

  it("marks submitted/under review/approved correctly", () => {
    expect(computeKycProgress("submitted", 4).percent).toBe(80);
    expect(computeKycProgress("under_review").percent).toBe(90);
    expect(computeKycProgress("approved").percent).toBe(100);
  });

  it("hides a success percentage for rejected or resubmission cases", () => {
    const rejected = computeKycProgress("rejected", 3);
    expect(rejected.showPercent).toBe(false);
    expect(rejected.actionRequired).toBe(true);
    const resubmit = computeKycProgress("resubmission_required", 2);
    expect(resubmit.showPercent).toBe(false);
    expect(resubmit.actionRequired).toBe(true);
  });
});
