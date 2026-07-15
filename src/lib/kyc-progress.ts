export type KycProgress = {
  percent: number;
  showPercent: boolean;
  caseOpened: boolean;
  documentsUploaded: boolean;
  underReview: boolean;
  approved: boolean;
  rejected: boolean;
  actionRequired: boolean;
};

type DocKind = string;

function hasKind(kinds: DocKind[], candidates: string[]) {
  return kinds.some((kind) => candidates.includes(kind));
}

/**
 * Map KYC lifecycle + uploaded document kinds to a non-misleading completion percentage.
 * Rejected / resubmission_required never show a success percentage.
 */
export function computeKycProgress(
  status: string | null | undefined,
  documentCount = 0,
  documentKinds: DocKind[] = [],
): KycProgress {
  const normalized = status || "not_started";
  const rejected = normalized === "rejected" || normalized === "expired";
  const resubmission = normalized === "resubmission_required";
  const approved = normalized === "approved";
  const underReview = normalized === "under_review";
  const submitted = normalized === "submitted";
  const caseOpened = normalized !== "not_started";
  const documentsUploaded =
    documentCount > 0 ||
    ["submitted", "under_review", "approved", "resubmission_required"].includes(normalized);

  if (rejected || resubmission) {
    return {
      percent: 0,
      showPercent: false,
      caseOpened,
      documentsUploaded,
      underReview: false,
      approved: false,
      rejected: rejected || resubmission,
      actionRequired: true,
    };
  }
  if (approved) {
    return {
      percent: 100,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: true,
      underReview: true,
      approved: true,
      rejected: false,
      actionRequired: false,
    };
  }
  if (underReview) {
    return {
      percent: 90,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: true,
      underReview: true,
      approved: false,
      rejected: false,
      actionRequired: false,
    };
  }
  if (submitted) {
    return {
      percent: 80,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: true,
      underReview: false,
      approved: false,
      rejected: false,
      actionRequired: false,
    };
  }

  // Draft / in-progress document ladder
  const identity = hasKind(documentKinds, ["national_id_front", "national_id_back", "passport"]);
  const address = hasKind(documentKinds, ["proof_of_address"]);
  const funds = hasKind(documentKinds, ["source_of_funds"]);
  if (funds && address && identity) {
    return {
      percent: 75,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: true,
      underReview: false,
      approved: false,
      rejected: false,
      actionRequired: false,
    };
  }
  if (address && identity) {
    return {
      percent: 65,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: true,
      underReview: false,
      approved: false,
      rejected: false,
      actionRequired: false,
    };
  }
  if (identity || documentsUploaded) {
    return {
      percent: 50,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: true,
      underReview: false,
      approved: false,
      rejected: false,
      actionRequired: false,
    };
  }
  if (caseOpened) {
    // Personal data captured in draft without docs yet
    return {
      percent: documentCount === 0 ? 30 : 15,
      showPercent: true,
      caseOpened: true,
      documentsUploaded: false,
      underReview: false,
      approved: false,
      rejected: false,
      actionRequired: false,
    };
  }
  return {
    percent: 0,
    showPercent: true,
    caseOpened: false,
    documentsUploaded: false,
    underReview: false,
    approved: false,
    rejected: false,
    actionRequired: false,
  };
}
