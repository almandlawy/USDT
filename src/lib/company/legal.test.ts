import { describe, expect, it } from "vitest";
import {
  companyBrandName,
  companyPublicAddress,
  companyReference,
  companyReferencePublicLabel,
  isCompanyLegalDetailsVerified,
  shouldHideUaeCompanyDetailsForCountry,
  varaPublicDisclosure,
} from "@/lib/company/legal";

describe("company legal disclosure gates", () => {
  it("treats 55896311472 as opaque company reference, not a licence label", () => {
    process.env.NEXT_PUBLIC_COMPANY_REFERENCE = "55896311472";
    expect(companyReference()).toBe("55896311472");
    expect(companyReferencePublicLabel("en")).toBe("Company reference");
    expect(companyReferencePublicLabel("ar")).toBe("مرجع الشركة");
    expect(companyReferencePublicLabel("en")).not.toMatch(/VARA|Trade Licence|Tax Registration|Company Registration/i);
  });

  it("hides address and empty VARA until verified", () => {
    process.env.COMPANY_LEGAL_DETAILS_VERIFIED = "false";
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS = "Office 206, Al Mulinia Tower";
    process.env.NEXT_PUBLIC_VARA_LICENSE_NUMBER = "";
    expect(isCompanyLegalDetailsVerified()).toBe(false);
    expect(companyPublicAddress()).toBeNull();
    expect(varaPublicDisclosure().show).toBe(false);
    expect(varaPublicDisclosure().licenseNumber).toBeNull();
  });

  it("shows VARA only when verified and all required fields are present", () => {
    process.env.COMPANY_LEGAL_DETAILS_VERIFIED = "true";
    process.env.NEXT_PUBLIC_LEGAL_NAME = "Gulf Gate FZE";
    process.env.NEXT_PUBLIC_VARA_LICENSE_NUMBER = "VARA-TEST-1";
    process.env.NEXT_PUBLIC_VARA_LICENSE_TYPE = "VASP";
    process.env.NEXT_PUBLIC_VARA_LICENSE_STATUS = "Active";
    process.env.NEXT_PUBLIC_VARA_LICENSED_ACTIVITIES = "Broker-Dealer Services";
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS = "Office 206, Al Mulinia Tower, Al Khabisi, Dubai, UAE";
    const vara = varaPublicDisclosure();
    expect(vara.show).toBe(true);
    expect(vara.licenseNumber).toBe("VARA-TEST-1");
    expect(companyPublicAddress()).toContain("Al Mulinia");
    // cleanup
    process.env.COMPANY_LEGAL_DETAILS_VERIFIED = "false";
    delete process.env.NEXT_PUBLIC_VARA_LICENSE_NUMBER;
  });

  it("hides UAE company details path for Iraq customers", () => {
    expect(shouldHideUaeCompanyDetailsForCountry("IQ")).toBe(true);
    expect(shouldHideUaeCompanyDetailsForCountry("AE")).toBe(false);
    expect(companyBrandName()).toBeTruthy();
  });
});
