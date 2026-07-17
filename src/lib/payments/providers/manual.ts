import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  VerifiedPaymentEvent,
} from "@/lib/payments/types";
import { generatePaymentReference, hashPayload } from "@/lib/quote-links/token";

export class BankTransferPaymentProvider implements PaymentProvider {
  readonly id = "bank_transfer" as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const reference = generatePaymentReference();
    return {
      provider: "bank_transfer",
      status: "pending",
      providerPaymentId: reference,
      requiresProof: true,
      instructions: {
        ar: `حوّل المبلغ ${input.amount} ${input.currency} مع كتابة المرجع ${reference} في وصف التحويل، ثم ارفع الإثبات. تبقى الحالة قيد المراجعة البشرية.`,
        en: `Transfer ${input.amount} ${input.currency} and include reference ${reference} in the transfer description, then upload proof. Status stays under human review.`,
      },
    };
  }

  async verifyWebhook(): Promise<VerifiedPaymentEvent> {
    throw new Error("Bank transfer has no automatic webhook");
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    return { providerPaymentId, status: "under_review" };
  }
}

export class ManualProofPaymentProvider implements PaymentProvider {
  readonly id = "manual_proof" as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      provider: "manual_proof",
      status: "pending",
      providerPaymentId: input.orderReference,
      requiresProof: true,
      instructions: {
        ar: "ادفع وفق التعليمات المعتمدة من الإدارة ثم ارفع إثباتاً واضحاً. لا يوجد تأكيد تلقائي.",
        en: "Pay using admin-approved instructions then upload clear proof. There is no automatic confirmation.",
      },
    };
  }

  async verifyWebhook(): Promise<VerifiedPaymentEvent> {
    throw new Error("Manual proof has no automatic webhook");
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    return { providerPaymentId, status: "under_review" };
  }
}

abstract class ManualWalletProvider implements PaymentProvider {
  abstract readonly id: "eand_money" | "dupay";
  abstract readonly label: string;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const phone =
      this.id === "eand_money"
        ? process.env.EAND_MONEY_REQUEST_PHONE?.trim()
        : process.env.DUPAY_REQUEST_PHONE?.trim();
    const qr =
      this.id === "eand_money"
        ? process.env.EAND_MONEY_QR_IMAGE_URL?.trim()
        : process.env.DUPAY_QR_IMAGE_URL?.trim();

    if (!phone && !qr) {
      return {
        provider: this.id,
        status: "failed",
        requiresProof: true,
        message: `${this.label} is enabled but no admin phone/QR is configured.`,
      };
    }

    const reference = generatePaymentReference();
    return {
      provider: this.id,
      status: "pending",
      providerPaymentId: reference,
      requiresProof: true,
      instructions: {
        ar: `ادفع ${input.amount} ${input.currency} عبر ${this.label} إلى البيانات المعتمدة من الإدارة، واكتب المرجع ${reference}، ثم ارفع لقطة الشاشة أو الإيصال. لا يوجد تأكيد تلقائي.`,
        en: `Pay ${input.amount} ${input.currency} via ${this.label} using admin-approved details, include reference ${reference}, then upload a screenshot or receipt. No automatic confirmation.`,
      },
    };
  }

  async verifyWebhook(request: Request): Promise<VerifiedPaymentEvent> {
    // Reserved for future official merchant webhooks — never invent payloads.
    const payload = await request.text();
    throw Object.assign(new Error(`${this.label} merchant API webhook is not configured`), {
      payloadHash: hashPayload(payload),
    });
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    return { providerPaymentId, status: "under_review" };
  }
}

export class EandMoneyPaymentProvider extends ManualWalletProvider {
  readonly id = "eand_money" as const;
  readonly label = "e& money";
}

export class DuPayPaymentProvider extends ManualWalletProvider {
  readonly id = "dupay" as const;
  readonly label = "du Pay";
}
