/**
 * Company / legal disclosure helpers.
 * Never invent VARA or trade-licence claims from brand name or company reference alone.
 */

export function companyBrandName(): string {
  return process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "Gulf Gate";
}

export function companyLegalName(): string | null {
  return process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || null;
}

/** Opaque owner-supplied reference — NOT a licence / TRN / phone by default. */
export function companyReference(): string | null {
  return process.env.NEXT_PUBLIC_COMPANY_REFERENCE?.trim() || null;
}

export function isCompanyLegalDetailsVerified(): boolean {
  return process.env.COMPANY_LEGAL_DETAILS_VERIFIED === "true";
}

export function companyPublicAddress(): string | null {
  if (!isCompanyLegalDetailsVerified()) return null;
  return process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || null;
}

/** Admin-only draft address — never render on public pages. */
export function companyAdminDraftAddress(): string {
  return (
    process.env.COMPANY_VERIFIED_LEGAL_ADDRESS_DRAFT?.trim() ||
    "Office 206, Al Mulinia Tower, Al Khabisi, Dubai, United Arab Emirates"
  );
}

export function varaPublicDisclosure(): {
  show: boolean;
  licenseNumber: string | null;
  licenseType: string | null;
  status: string | null;
  activities: string | null;
  validFrom: string | null;
  validTo: string | null;
  legalName: string | null;
} {
  const licenseNumber = process.env.NEXT_PUBLIC_VARA_LICENSE_NUMBER?.trim() || null;
  const licenseType = process.env.NEXT_PUBLIC_VARA_LICENSE_TYPE?.trim() || null;
  const status = process.env.NEXT_PUBLIC_VARA_LICENSE_STATUS?.trim() || null;
  const activities = process.env.NEXT_PUBLIC_VARA_LICENSED_ACTIVITIES?.trim() || null;
  const validFrom = process.env.NEXT_PUBLIC_VARA_LICENSE_VALID_FROM?.trim() || null;
  const validTo = process.env.NEXT_PUBLIC_VARA_LICENSE_VALID_TO?.trim() || null;
  const legalName = companyLegalName();

  const show =
    isCompanyLegalDetailsVerified() &&
    Boolean(licenseNumber && licenseType && status === "Active" && activities && legalName);

  return {
    show,
    licenseNumber: show ? licenseNumber : null,
    licenseType: show ? licenseType : null,
    status: show ? status : null,
    activities: show ? activities : null,
    validFrom: show ? validFrom : null,
    validTo: show ? validTo : null,
    legalName: show ? legalName : null,
  };
}

/** Label for company reference — never claim licence type without verification. */
export function companyReferencePublicLabel(locale: "ar" | "en"): string {
  return locale === "ar" ? "مرجع الشركة" : "Company reference";
}

export function shouldHideUaeCompanyDetailsForCountry(countryCode: string): boolean {
  return countryCode === "IQ";
}
