import "server-only";

/**
 * Pre-launch document intake gates.
 * Default false in production until legal/contact readiness is complete.
 */
export function isKycIntakeEnabled(): boolean {
  if (process.env.KYC_INTAKE_ENABLED === "true") {
    return isLegalIntakeReady();
  }
  return false;
}

export function isProofIntakeEnabled(): boolean {
  if (process.env.PROOF_INTAKE_ENABLED === "true") {
    return isLegalIntakeReady();
  }
  return false;
}

/** Public mirrors — UI only; server gates remain authoritative. */
export function publicKycIntakeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_KYC_INTAKE_ENABLED === "true" && isKycIntakeEnabled();
}

export function publicProofIntakeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PROOF_INTAKE_ENABLED === "true" && isProofIntakeEnabled();
}

export function isLegalIntakeReady(): boolean {
  const legal = process.env.NEXT_PUBLIC_LEGAL_NAME?.trim();
  const privacy = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();
  return Boolean(legal && privacy);
}

export function trustContactReadiness() {
  return {
    companyName: Boolean(process.env.NEXT_PUBLIC_COMPANY_NAME?.trim()),
    legalName: Boolean(process.env.NEXT_PUBLIC_LEGAL_NAME?.trim()),
    supportEmail: Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()),
    privacyEmail: Boolean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim()),
    whatsapp: Boolean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()),
    address: Boolean(process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim()),
    workingHours: Boolean(process.env.NEXT_PUBLIC_WORKING_HOURS?.trim()),
    tradeLicence: Boolean(process.env.NEXT_PUBLIC_TRADE_LICENSE_NUMBER?.trim()),
    legalReviewRef: Boolean(process.env.LEGAL_APPROVAL_REFERENCE?.trim()),
    kycIntake: isKycIntakeEnabled(),
    proofIntake: isProofIntakeEnabled(),
  };
}
