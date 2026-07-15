export type KycProgress = {
  percent: number;
  showPercent: boolean;
  caseOpened: boolean;
  documentsUploaded: boolean;
  underReview: boolean;
  approved: boolean;
  rejected: boolean;
};

/** Map KYC lifecycle to a non-misleading completion percentage. */
export function computeKycProgress(status: string | null | undefined, documentCount = 0): KycProgress {
  const normalized = status || "not_started";
  const rejected = normalized === "rejected" || normalized === "expired";
  const approved = normalized === "approved";
  const underReview = normalized === "under_review";
  const caseOpened = normalized !== "not_started";
  const documentsUploaded = documentCount > 0 || ["submitted", "under_review", "approved", "resubmission_required"].includes(normalized);

  if (rejected) {
    return { percent: 0, showPercent: false, caseOpened, documentsUploaded, underReview: false, approved: false, rejected: true };
  }
  if (approved) {
    return { percent: 100, showPercent: true, caseOpened: true, documentsUploaded: true, underReview: true, approved: true, rejected: false };
  }
  if (underReview) {
    return { percent: 75, showPercent: true, caseOpened: true, documentsUploaded: true, underReview: true, approved: false, rejected: false };
  }
  if (documentsUploaded) {
    return { percent: 50, showPercent: true, caseOpened: true, documentsUploaded: true, underReview: false, approved: false, rejected: false };
  }
  if (caseOpened) {
    return { percent: 25, showPercent: true, caseOpened: true, documentsUploaded: false, underReview: false, approved: false, rejected: false };
  }
  return { percent: 0, showPercent: true, caseOpened: false, documentsUploaded: false, underReview: false, approved: false, rejected: false };
}
